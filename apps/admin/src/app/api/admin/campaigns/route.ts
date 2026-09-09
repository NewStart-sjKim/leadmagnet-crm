import { db, campaigns, eq, desc } from "@leadmagnet/db";
import { createCampaignSchema } from "@leadmagnet/shared";
import { handler, json, parseJson, requireOperator } from "@/lib/api";

/** GET /api/admin/campaigns — 캠페인 목록 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const rows = await db.select().from(campaigns).where(eq(campaigns.operatorId, op.id)).orderBy(desc(campaigns.createdAt));
  return json({ campaigns: rows });
});

/** POST /api/admin/campaigns — 캠페인 생성 */
export const POST = handler(async (req) => {
  const op = await requireOperator(req);
  const input = await parseJson(req, createCampaignSchema);
  const [row] = await db
    .insert(campaigns)
    .values({ operatorId: op.id, name: input.name, description: input.description ?? null })
    .returning();
  return json({ campaign: row }, { status: 201 });
});
