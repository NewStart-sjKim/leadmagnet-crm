import Link from "next/link";
import { db, campaigns, eq } from "@leadmagnet/db";
import { getCurrentOperator } from "@/lib/session";
import { fetchLeads } from "@/lib/leads";
import { PageHeader } from "@/components/ui";
import { LeadsTable } from "@/components/leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ campaignId?: string; page?: string }> }) {
  const sp = await searchParams;
  const op = (await getCurrentOperator())!;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [result, cs] = await Promise.all([
    fetchLeads(op.id, { campaignId: sp.campaignId, page, pageSize: 50 }),
    db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).where(eq(campaigns.operatorId, op.id)),
  ]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const q = (p: number) => `/leads?${new URLSearchParams({ ...(sp.campaignId ? { campaignId: sp.campaignId } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="CRM 명단"
        description={`총 ${result.total.toLocaleString()}건`}
        actions={
          <form className="flex gap-2">
            <select name="campaignId" defaultValue={sp.campaignId ?? ""} className="input w-auto">
              <option value="">전체 캠페인</option>
              {cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-secondary">필터</button>
          </form>
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
