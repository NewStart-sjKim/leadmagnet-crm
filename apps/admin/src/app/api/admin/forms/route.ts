import { db, forms, campaigns, htmlTemplates, eq, and, desc } from "@leadmagnet/db";
import { createFormSchema } from "@leadmagnet/shared";
import { ApiError, handler, json, parseJson, requireOperator } from "@/lib/api";
import { makeSlug } from "@/lib/ids";
import { publicFormUrl } from "@/lib/env";

/** GET /api/admin/forms?campaignId= — 폼 목록 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const rows = await db
    .select({
      id: forms.id,
      campaignId: forms.campaignId,
      templateId: forms.templateId,
      slug: forms.slug,
      title: forms.title,
      isActive: forms.isActive,
      createdAt: forms.createdAt,
      campaignName: campaigns.name,
    })
    .from(forms)
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(and(eq(campaigns.operatorId, op.id), campaignId ? eq(forms.campaignId, campaignId) : undefined))
    .orderBy(desc(forms.createdAt));
  return json({ forms: rows.map((f) => ({ ...f, publicUrl: publicFormUrl(f.slug) })) });
});

/**
 * POST /api/admin/forms — 커스텀 신청 폼 생성
 * 템플릿 HTML을 스냅샷으로 복사해 저장한다 (이후 템플릿 변경이 배포된 폼에 영향 주지 않음).
 */
export const POST = handler(async (req) => {
  const op = await requireOperator(req);
  const input = await parseJson(req, createFormSchema);

  const [campaign] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, input.campaignId), eq(campaigns.operatorId, op.id)))
    .limit(1);
  if (!campaign) throw new ApiError(404, "캠페인을 찾을 수 없습니다");

  const [template] = await db
    .select({ id: htmlTemplates.id, html: htmlTemplates.html })
    .from(htmlTemplates)
    .where(and(eq(htmlTemplates.id, input.templateId), eq(htmlTemplates.operatorId, op.id)))
    .limit(1);
  if (!template) throw new ApiError(404, "템플릿을 찾을 수 없습니다");

  const slug = input.slug ?? makeSlug(input.title);
  const [exists] = await db.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug)).limit(1);
  if (exists) throw new ApiError(409, "이미 사용 중인 slug 입니다");

  const [row] = await db
    .insert(forms)
    .values({
      campaignId: campaign.id,
      templateId: template.id,
      slug,
      title: input.title,
      htmlSnapshot: template.html,
      successMessage: input.successMessage ?? undefined,
    })
    .returning();
  const { htmlSnapshot: _h, ...rest } = row!;
  return json({ form: { ...rest, publicUrl: publicFormUrl(rest.slug) } }, { status: 201 });
});
