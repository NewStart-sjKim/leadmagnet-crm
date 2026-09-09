import type { ChannelStats } from "@/lib/stats";
import { ChannelBadge, pct } from "./ui";

export function ChannelTable({ rows }: { rows: ChannelStats[] }) {
  const visible = rows.filter((r) => r.channel !== "DIRECT" || r.visits > 0 || r.leads > 0);
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">채널</th>
            <th className="px-4 py-2.5 text-right font-medium">방문</th>
            <th className="px-4 py-2.5 text-right font-medium">방문자</th>
            <th className="px-4 py-2.5 text-right font-medium">신청</th>
            <th className="px-4 py-2.5 text-right font-medium">전환율</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {visible.map((r) => (
            <tr key={r.channel} data-testid={`channel-row-${r.channel}`}>
              <td className="px-4 py-2.5"><ChannelBadge channel={r.channel} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.visits}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.visitors}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.leads}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">{pct(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
