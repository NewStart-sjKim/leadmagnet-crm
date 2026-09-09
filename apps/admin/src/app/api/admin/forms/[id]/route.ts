import { z } from "zod";
import { db, forms, campaigns, eq, and } from "@leadmagnet/db";
import { ApiError, handler, json, parseJson, requireOperator, type RouteCtx } from "@/lib/api";
import { publicFormUrl } from "@/lib/env";

export async function findOwnedForm(id: string, operatorId: string) {
  const [row] = await db
    .select({ form: forms })
    .from(forms)
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(and(eq(forms.id, id), eq(campaigns.operatorId, operatorId)))
    .limit(1);
  if (!row) throw new ApiError(404, "폼을 찾을 수 없습니다");
  return row.form;
}

/** GET /api/admin/forms/:id — 폼 상세 + 링크 */
export const GET = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  const form = await findOwnedForm(id, op.id);
  const links = await db.query.distributionLinks.findMany({
    where: (l, { eq }) => eq(l.formId, id),
    orderBy: (l, { asc }) => asc(l.createdAt),
  });
  const { htmlSnapshot: _h, ...rest } = form;
  return json({
    form: { ...rest, publicUrl: publicFormUrl(rest.slug) },
    links: links.map((l) => ({ ...l, url: publicFormUrl(rest.slug, l.code) })),
  });
});

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  successMessage: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/forms/:id — 제목/완료 메시지/활성 상태 */
export const PATCH = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  await findOwnedForm(id, op.id);
  const input = await parseJson(req, patchSchema);
  const [row] = await db.update(forms).set(input).where(eq(forms.id, id)).returning();
  const { htmlSnapshot: _h, ...rest } = row!;
  return json({ form: { ...rest, publicUrl: publicFormUrl(rest.slug) } });
});
