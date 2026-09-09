import { db, distributionLinks, eq } from "@leadmagnet/db";
import { createLinkSchema, CHANNEL_PREFIX } from "@leadmagnet/shared";
import { handler, json, parseJson, requireOperator, type RouteCtx } from "@/lib/api";
import { shortId } from "@/lib/ids";
import { publicFormUrl } from "@/lib/env";
import { findOwnedForm } from "../route";

/** GET /api/admin/forms/:id/links — 채널별 배포 링크 목록 */
export const GET = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  const form = await findOwnedForm(id, op.id);
  const rows = await db.select().from(distributionLinks).where(eq(distributionLinks.formId, id));
  return json({ links: rows.map((l) => ({ ...l, url: publicFormUrl(form.slug, l.code) })) });
});

/**
 * POST /api/admin/forms/:id/links — 채널(INSTAGRAM|X|YOUTUBE|THREADS)용 배포 링크 생성
 * 같은 채널에 여러 링크(예: 스토리/피드)를 만들 수 있도록 label 로 구분한다.
 */
export const POST = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  const form = await findOwnedForm(id, op.id);
  const input = await parseJson(req, createLinkSchema);

  const code = `${CHANNEL_PREFIX[input.channel]}_${shortId(7)}`;
  const [row] = await db
    .insert(distributionLinks)
    .values({ formId: form.id, channel: input.channel, code, label: input.label ?? null })
    .returning();
  return json({ link: { ...row!, url: publicFormUrl(form.slug, row!.code) } }, { status: 201 });
});
