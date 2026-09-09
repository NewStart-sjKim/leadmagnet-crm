import { db, campaigns, eq, and } from "@leadmagnet/db";
import { updateCampaignSchema } from "@leadmagnet/shared";
import { ApiError, handler, json, parseJson, requireOperator, type RouteCtx } from "@/lib/api";

async function findOwned(id: string, operatorId: string) {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.operatorId, operatorId)))
    .limit(1);
  if (!row) throw new ApiError(404, "캠페인을 찾을 수 없습니다");
  return row;
}

/** GET /api/admin/campaigns/:id */
export const GET = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  const campaign = await findOwned(id, op.id);
  const formRows = await db.query.forms.findMany({
    where: (f, { eq }) => eq(f.campaignId, id),
    with: { links: true },
    orderBy: (f, { desc }) => desc(f.createdAt),
  });
  return json({ campaign, forms: formRows.map(({ htmlSnapshot: _h, ...f }) => f) });
});

/** PATCH /api/admin/campaigns/:id — 이름/설명/상태 변경 */
export const PATCH = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  await findOwned(id, op.id);
  const input = await parseJson(req, updateCampaignSchema);
  const [row] = await db.update(campaigns).set(input).where(eq(campaigns.id, id)).returning();
  return json({ campaign: row });
});

/** DELETE /api/admin/campaigns/:id — 하위 폼/링크/방문/리드 cascade 삭제 */
export const DELETE = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  await findOwned(id, op.id);
  await db.delete(campaigns).where(eq(campaigns.id, id));
  return json({ ok: true });
});
