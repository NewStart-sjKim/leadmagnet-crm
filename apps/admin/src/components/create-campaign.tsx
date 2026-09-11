"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateCampaign() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    router.push(`/campaigns/${body.campaign.id}`);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)} data-testid="open-create-campaign">
        + 새 캠페인
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="새 캠페인">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="create-campaign">
          <div>
            <label className="label" htmlFor="c-name">캠페인 이름</label>
            <input id="c-name" className="input" required placeholder="예: 9월 무료 전자책 배포" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-desc">설명 (선택)</label>
            <textarea id="c-desc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>취소</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "생성 중…" : "캠페인 만들기"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
