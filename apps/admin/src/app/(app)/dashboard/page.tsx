import Link from "next/link";
import { getCurrentOperator } from "@/lib/session";
import { campaignStats, channelStats } from "@/lib/stats";
import { PageHeader, StatTiles, StatusBadge, Empty, pct } from "@/components/ui";
import { ChannelTable } from "@/components/channel-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const op = (await getCurrentOperator())!;
  const [cs, ch] = await Promise.all([campaignStats(op.id), channelStats(op.id)]);
  const total = cs.reduce(
    (a, c) => ({ visits: a.visits + c.visits, visitors: a.visitors + c.visitors, leads: a.leads + c.leads, conversionRate: 0 }),
    { visits: 0, visitors: 0, leads: 0, conversionRate: 0 },
  );
  total.conversionRate = total.visitors ? total.leads / total.visitors : 0;

  return (
    <>
      <PageHeader title="대시보드" description="전체 캠페인의 방문 · 방문자 · 신청 · 전환율과 채널별 성과" />
      <StatTiles m={total} />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">캠페인별 성과</h2>
        {cs.length === 0 ? (
          <Empty>아직 캠페인이 없습니다. <Link className="underline" href="/campaigns">첫 캠페인을 만들어 보세요.</Link></Empty>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">캠페인</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5 text-right font-medium">폼</th>
                  <th className="px-4 py-2.5 text-right font-medium">방문</th>
                  <th className="px-4 py-2.5 text-right font-medium">방문자</th>
                  <th className="px-4 py-2.5 text-right font-medium">신청</th>
                  <th className="px-4 py-2.5 text-right font-medium">전환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cs.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-neutral-50" data-testid="campaign-stat-row">
                    <td className="px-4 py-2.5"><Link className="font-medium hover:underline" href={`/campaigns/${c.campaignId}`}>{c.name}</Link></td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.formCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.visits}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.visitors}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.leads}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{pct(c.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">채널별 성과 (전체)</h2>
        <ChannelTable rows={ch} />
      </section>
    </>
  );
}
