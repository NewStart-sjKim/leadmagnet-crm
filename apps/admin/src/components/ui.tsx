import type { Metrics } from "@/lib/stats";
import { CHANNEL_LABEL, type ChannelValue } from "@leadmagnet/shared";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function pct(r: number) {
  return `${(r * 100).toFixed(1)}%`;
}

export function StatTiles({ m }: { m: Metrics }) {
  const tiles = [
    { label: "방문", value: m.visits.toLocaleString() },
    { label: "방문자", value: m.visitors.toLocaleString() },
    { label: "신청", value: m.leads.toLocaleString() },
    { label: "전환율", value: pct(m.conversionRate), hint: "신청 ÷ 방문자" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="card p-4">
          <div className="text-xs font-medium text-neutral-500">{t.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</div>
          {t.hint && <div className="mt-0.5 text-[11px] text-neutral-400">{t.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export function ChannelBadge({ channel }: { channel: ChannelValue | "DIRECT" | null }) {
  if (!channel || channel === "DIRECT") return <span className="badge bg-neutral-100 text-neutral-600">직접 유입</span>;
  const color: Record<ChannelValue, string> = {
    INSTAGRAM: "bg-pink-50 text-pink-700",
    X: "bg-neutral-900 text-white",
    YOUTUBE: "bg-red-50 text-red-700",
    THREADS: "bg-neutral-100 text-neutral-800",
  };
  return <span className={`badge ${color[channel]}`}>{CHANNEL_LABEL[channel]}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    DRAFT: ["초안", "bg-neutral-100 text-neutral-600"],
    ACTIVE: ["진행 중", "bg-emerald-50 text-emerald-700"],
    PAUSED: ["일시중지", "bg-amber-50 text-amber-700"],
    ARCHIVED: ["보관", "bg-neutral-100 text-neutral-500"],
  };
  const [label, cls] = map[status] ?? [status, "bg-neutral-100"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-10 text-center text-sm text-neutral-500">{children}</div>;
}

export function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}
