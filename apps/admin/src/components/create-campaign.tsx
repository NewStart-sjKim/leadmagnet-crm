"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCampaign() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(body.error ?? "생성 실패");
    router.push(`/campaigns/${body.campaign.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" data-testid="create-campaign">
      <h2 className="text-sm font-semibold">새 캠페인</h2>
      <div>
        <label className="label" htmlFor="c-name">캠페인 이름</label>
        <input id="c-name" className="input" required placeholder="예: 9월 무료 전자책 배포" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="c-desc">설명 (선택)</label>
        <textarea id="c-desc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "생성 중…" : "캠페인 만들기"}</button>
    </form>
  );
}
