import Link from "next/link";
import { db, campaigns, eq } from "@leadmagnet/db";
import { getCurrentOperator } from "@/lib/session";
import { fetchLeads } from "@/lib/leads";
import { PageHeader } from "@/components/ui";
import { LeadsTable } from "@/components/leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ campaignId?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const op = (await getCurrentOperator())!;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [result, cs] = await Promise.all([
    fetchLeads(op.id, { campaignId: sp.campaignId, q: sp.q, page, pageSize: 50 }),
    db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).where(eq(campaigns.operatorId, op.id)),
  ]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  // 현재 필터(캠페인·검색어)를 유지한 채 page / format 만 덧붙인다
  const withFilter = (extra: Record<string, string>) =>
    new URLSearchParams({ ...(sp.campaignId ? { campaignId: sp.campaignId } : {}), ...(sp.q ? { q: sp.q } : {}), ...extra }).toString();
  const q = (p: number) => `/leads?${withFilter({ page: String(p) })}`;
  const csvHref = `/api/admin/leads?${withFilter({ format: "csv" })}`;

  return (
    <>
      <PageHeader
        title="CRM 명단"
        description={`총 ${result.total.toLocaleString()}건`}
        actions={
          <div className="flex flex-wrap gap-2">
            <form className="flex gap-2">
              <select name="campaignId" defaultValue={sp.campaignId ?? ""} className="input w-auto">
                <option value="">전체 캠페인</option>
                {cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input name="q" defaultValue={sp.q ?? ""} placeholder="이름·이메일·연락처 검색" className="input w-48" aria-label="명단 검색" />
              <button className="btn-secondary">필터</button>
            </form>
            <a className="btn-secondary" href={csvHref} download data-testid="leads-csv">CSV 다운로드</a>
          </div>
        }
      />
      <LeadsTable rows={result.leads} showCampaign />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          {page > 1 && <Link className="btn-secondary" href={q(page - 1)}>이전</Link>}
          <span className="text-neutral-500">{page} / {pages}</span>
          {page < pages && <Link className="btn-secondary" href={q(page + 1)}>다음</Link>}
        </div>
      )}
    </>
  );
}
