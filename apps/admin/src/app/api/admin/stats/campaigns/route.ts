import { handler, json, requireOperator } from "@/lib/api";
import { campaignStats } from "@/lib/stats";

/** GET /api/admin/stats/campaigns — 캠페인별 방문/방문자/신청/전환율 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  return json({ campaigns: await campaignStats(op.id) });
});
