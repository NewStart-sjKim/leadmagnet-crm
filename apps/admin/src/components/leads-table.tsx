import type { LeadRow } from "@/lib/leads";
import { ChannelBadge, Empty, fmtDate } from "./ui";

export function LeadsTable({ rows, showCampaign = false }: { rows: LeadRow[]; showCampaign?: boolean }) {
  if (rows.length === 0) return <Empty>아직 신청이 없습니다.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">신청 시각</th>
            {showCampaign && <th className="px-4 py-2.5 font-medium">캠페인</th>}
            <th className="px-4 py-2.5 font-medium">폼</th>
            <th className="px-4 py-2.5 font-medium">채널</th>
            <th className="px-4 py-2.5 font-medium">이름</th>
            <th className="px-4 py-2.5 font-medium">이메일</th>
            <th className="px-4 py-2.5 font-medium">연락처</th>
            <th className="px-4 py-2.5 font-medium">전체 응답</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((l) => (
            <tr key={l.id} data-testid="lead-row">
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-neutral-500">{fmtDate(l.createdAt)}</td>
              {showCampaign && <td className="px-4 py-2.5">{l.campaignName}</td>}
              <td className="px-4 py-2.5">{l.formTitle}</td>
              <td className="px-4 py-2.5"><ChannelBadge channel={l.channel} /></td>
              <td className="px-4 py-2.5">{l.name ?? "—"}</td>
              <td className="px-4 py-2.5">{l.email ?? "—"}</td>
              <td className="px-4 py-2.5">{l.phone ?? "—"}</td>
              <td className="px-4 py-2.5">
                <details>
                  <summary className="cursor-pointer text-xs text-neutral-600">{Object.keys(l.payload).length}개 필드</summary>
                  <pre className="mt-1 max-w-md overflow-x-auto rounded bg-neutral-50 p-2 text-[11px]">{JSON.stringify(l.payload, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
