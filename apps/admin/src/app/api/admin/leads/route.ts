import { NextResponse } from "next/server";
import { handler, json, requireOperator } from "@/lib/api";
import { fetchLeads, fetchLeadsForExport, leadsToCsv } from "@/lib/leads";

/**
 * GET /api/admin/leads?campaignId=&formId=&q=&page=&pageSize= — CRM 명단
 * - `q`: 이름·이메일·연락처 부분 일치(대소문자 무시)
 * - `format=csv`: 필터에 맞는 명단 전체를 CSV 파일로 내려준다
 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const sp = req.nextUrl.searchParams;
  const filter = {
    campaignId: sp.get("campaignId") ?? undefined,
    formId: sp.get("formId") ?? undefined,
    q: sp.get("q")?.slice(0, 100) || undefined,
  };

  if (sp.get("format") === "csv") {
    const rows = await fetchLeadsForExport(op.id, filter);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(leadsToCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="leads-${stamp}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 50) || 50));
  return json(await fetchLeads(op.id, { ...filter, page, pageSize }));
});
