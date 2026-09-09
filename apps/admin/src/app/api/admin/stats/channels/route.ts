import { handler, json, requireOperator } from "@/lib/api";
import { channelStats } from "@/lib/stats";

/** GET /api/admin/stats/channels?campaignId=&formId= — 채널별 성과 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const campaignId = req.nextUrl.searchParams.get("campaignId") ?? undefined;
  const formId = req.nextUrl.searchParams.get("formId") ?? undefined;
  return json({ channels: await channelStats(op.id, { campaignId, formId }) });
});
