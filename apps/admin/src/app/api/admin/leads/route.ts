import { handler, json, requireOperator } from "@/lib/api";
import { fetchLeads } from "@/lib/leads";

/** GET /api/admin/leads?campaignId=&formId=&page=&pageSize= — CRM 명단 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 50) || 50));
  const result = await fetchLeads(op.id, {
    campaignId: sp.get("campaignId") ?? undefined,
    formId: sp.get("formId") ?? undefined,
    page,
    pageSize,
  });
  return json(result);
});
