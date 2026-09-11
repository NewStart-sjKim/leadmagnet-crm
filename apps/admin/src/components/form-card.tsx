"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNELS, CHANNEL_LABEL, type ChannelValue } from "@leadmagnet/shared";
import type { Metrics } from "@/lib/stats";
import { ChannelBadge, pct } from "./ui";

type Link = { id: string; channel: ChannelValue; code: string; label: string | null; url: string; metrics: Metrics };
type FormInfo = { id: string; slug: string; title: string; isActive: boolean; publicUrl: string; previewUrl: string };

export function FormCard({ form, links, stats }: { form: FormInfo; links: Link[]; stats: Metrics }) {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  async function createLink(channel: ChannelValue) {
    setBusy(channel);
    setErr(null);
    // 이름을 적지 않았고 같은 채널에 이미 링크가 있으면 구분되도록 번호를 붙인다
    const existing = links.filter((l) => l.channel === channel).length;
    const name = label.trim() || (existing > 0 ? `${CHANNEL_LABEL[channel]} #${existing + 1}` : undefined);
    const res = await fetch(`/api/admin/forms/${form.id}/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, label: name }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "링크 생성 실패");
      return;
    }
    setLabel("");
    router.refresh();
  }

  async function deleteLink(l: Link) {
    if (!confirm(`배포 링크를 삭제할까요?\n${l.label ?? CHANNEL_LABEL[l.channel]}`)) return;
    setBusy(l.id);
    setErr(null);
    const res = await fetch(`/api/admin/forms/${form.id}/links/${l.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "링크 삭제 실패");
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-neutral-600">채널별 배포 링크</h3>
          <div className="flex flex-wrap items-center gap-1">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="링크 이름 (선택) 예: 스토리"
              aria-label="배포 링크 이름"
              data-testid="link-label"
              className="input !w-44 !py-1 text-xs"
            />
            {CHANNELS.map((c) => (
              <button key={c} onClick={() => createLink(c)} disabled={busy === c} className="btn-secondary !px-2.5 !py-1 text-xs" data-testid={`create-link-${c}`}>+ {CHANNEL_LABEL[c]}</button>
            ))}
          </div>
        </div>
        <p className="mb-2 text-[11px] text-neutral-500">같은 채널에도 붙이는 위치(프로필·스토리·고정 게시물)마다 링크를 따로 만들면 어디가 잘 되는지 비교할 수 있습니다.</p>
        {err && <p className="mb-2 text-xs text-red-600" role="alert">{err}</p>}
        {links.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-3 text-center text-xs text-neutral-500">배포할 채널의 버튼을 눌러 링크를 만드세요.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {links.map((l) => (
              // 줄 전체에 hover 를 주고, 삭제 버튼 위에서는 빨갛게 바꿔 어느 줄이 지워질지 보이게 한다
              <li
                key={l.id}
                className="px-3 py-2 text-sm transition-colors hover:bg-neutral-50 has-[[data-testid=delete-link]:hover]:bg-red-50"
                data-testid="link-item"
              >
                <div className="flex items-center gap-3">
                  <ChannelBadge channel={l.channel} />
                  {l.label && <span className="text-xs text-neutral-500">{l.label}</span>}
                  <code className="min-w-0 flex-1 truncate text-xs text-neutral-700">{l.url}</code>
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => copy(l.url, l.id)}>{copied === l.id ? "복사됨" : "복사"}</button>
                  <button className="btn-danger !px-2 !py-1 text-xs" disabled={busy === l.id} onClick={() => deleteLink(l)} data-testid="delete-link">삭제</button>
                </div>
                <div className="mt-1 flex gap-3 pl-1 text-[11px] tabular-nums text-neutral-500">
                  <span>방문 <b className="text-neutral-700">{l.metrics.visits}</b></span>
                  <span>방문자 <b className="text-neutral-700">{l.metrics.visitors}</b></span>
                  <span>신청 <b className="text-neutral-700">{l.metrics.leads}</b></span>
                  <span>전환율 <b className="text-neutral-700">{pct(l.metrics.conversionRate)}</b></span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
