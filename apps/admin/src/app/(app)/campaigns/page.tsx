import Link from "next/link";
import { getCurrentOperator } from "@/lib/session";
import { campaignStats } from "@/lib/stats";
import { PageHeader, StatusBadge, Empty, pct } from "@/components/ui";
import { CreateCampaign } from "@/components/create-campaign";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const op = (await getCurrentOperator())!;
  const cs = await campaignStats(op.id);
  return (
    <>
      <PageHeader title="캠페인 · 폼" description="캠페인을 만들고, 등록한 템플릿으로 커스텀 신청 폼을 생성해 채널별 링크로 배포합니다." actions={<CreateCampaign />} />
      <div>
        <div>
          {cs.length === 0 ? (
            <Empty>캠페인이 없습니다. 오른쪽 위 “+ 새 캠페인”으로 첫 캠페인을 만들어 보세요.</Empty>
          ) : (
            <ul className="space-y-3">
              {cs.map((c) => (
                <li key={c.campaignId} className="card p-4 hover:border-neutral-400" data-testid="campaign-item">
                  <Link href={`/campaigns/${c.campaignId}`} className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-medium">{c.name} <StatusBadge status={c.status} /></div>
                      <div className="mt-1 text-xs text-neutral-500">폼 {c.formCount}개</div>
                    </div>
                    <div className="flex gap-5 text-right text-sm tabular-nums">
                      <div><div className="text-[11px] text-neutral-500">방문자</div>{c.visitors}</div>
                      <div><div className="text-[11px] text-neutral-500">신청</div>{c.leads}</div>
                      <div><div className="text-[11px] text-neutral-500">전환율</div><span className="font-medium">{pct(c.conversionRate)}</span></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
