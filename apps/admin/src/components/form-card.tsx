"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNELS, CHANNEL_LABEL, type ChannelValue } from "@leadmagnet/shared";
import type { Metrics } from "@/lib/stats";
import { ChannelBadge, pct } from "./ui";

type Link = { id: string; channel: ChannelValue; code: string; label: string | null; url: string };
type FormInfo = { id: string; slug: string; title: string; isActive: boolean; publicUrl: string; previewUrl: string };

export function FormCard({ form, links, stats }: { form: FormInfo; links: Link[]; stats: Metrics }) {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function createLink(channel: ChannelValue) {
    setBusy(channel);
    setErr(null);
    const existing = links.filter((l) => l.channel === channel).length;
    const res = await fetch(`/api/admin/forms/${form.id}/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, label: existing > 0 ? `${CHANNEL_LABEL[channel]} #${existing + 1}` : undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "링크 생성 실패");
      return;
    }
    router.refresh();
  }

  async function toggleActive() {
    setBusy("active");
    await fetch(`/api/admin/forms/${form.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isActive: !form.isActive }) });
    setBusy(null);
    router.refresh();
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="card p-5" data-testid="form-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            {form.title}
            <span className={`badge ${form.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{form.isActive ? "공개 중" : "비공개"}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
            <code className="truncate">{form.publicUrl}</code>
            <button className="text-neutral-700 underline" onClick={() => copy(form.publicUrl, "base")}>{copied === "base" ? "복사됨" : "복사"}</button>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setPreview((v) => !v)}>{preview ? "미리보기 닫기" : "미리보기"}</button>
          <button className="btn-secondary" disabled={busy === "active"} onClick={toggleActive}>{form.isActive ? "비공개로" : "공개로"}</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
        {[["방문", stats.visits], ["방문자", stats.visitors], ["신청", stats.leads], ["전환율", pct(stats.conversionRate)]].map(([l, v]) => (
          <div key={String(l)} className="rounded-lg bg-neutral-50 py-2"><div className="text-[11px] text-neutral-500">{l}</div><div className="font-semibold tabular-nums">{v}</div></div>
        ))}
      </div>

      {preview && (
        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
          <div className="flex items-center justify-between bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-500">
            <span>미리보기 — 다른 origin의 sandbox iframe 으로 격리되어 렌더링됩니다. 방문/제출은 기록되지 않습니다.</span>
            <a className="underline" href={form.previewUrl} target="_blank" rel="noreferrer noopener">새 창</a>
          </div>
          {/* allow-same-origin 을 주지 않는다: 업로드된 HTML은 어떤 origin 에도 속하지 않는 opaque origin 에서 실행된다 */}
          <iframe title={`${form.title} 미리보기`} src={form.previewUrl} sandbox="allow-forms allow-scripts" referrerPolicy="no-referrer" className="h-[520px] w-full bg-white" />
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-600">채널별 배포 링크</h3>
          <div className="flex gap-1">
            {CHANNELS.map((c) => (
              <button key={c} onClick={() => createLink(c)} disabled={busy === c} className="btn-secondary !px-2.5 !py-1 text-xs" data-testid={`create-link-${c}`}>+ {CHANNEL_LABEL[c]}</button>
            ))}
          </div>
        </div>
        {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
        {links.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-3 text-center text-xs text-neutral-500">배포할 채널의 버튼을 눌러 링크를 만드세요.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid="link-item">
                <ChannelBadge channel={l.channel} />
                {l.label && <span className="text-xs text-neutral-500">{l.label}</span>}
                <code className="min-w-0 flex-1 truncate text-xs text-neutral-700">{l.url}</code>
                <button className="text-xs text-neutral-700 underline" onClick={() => copy(l.url, l.id)}>{copied === l.id ? "복사됨" : "복사"}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
