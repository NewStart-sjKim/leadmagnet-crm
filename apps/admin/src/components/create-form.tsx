"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateForm({ campaignId, templates }: { campaignId: string; templates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [successMessage, setSuccessMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId, templateId, title, successMessage: successMessage || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(body.error ?? "생성 실패");
    setTitle("");
    setSuccessMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 self-start p-5" data-testid="create-form">
      <h2 className="text-sm font-semibold">새 신청 폼</h2>
      <div>
        <label className="label" htmlFor="f-title">폼 제목</label>
        <input id="f-title" className="input" required placeholder="예: 전자책 신청" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="f-template">HTML 템플릿</label>
        <select id="f-template" className="input" required value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={templates.length === 0}>
          {templates.length === 0 && <option value="">등록된 템플릿이 없습니다</option>}
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-success">완료 메시지 (선택)</label>
        <input id="f-success" className="input" placeholder="신청이 완료되었습니다. 감사합니다!" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy || templates.length === 0}>{busy ? "생성 중…" : "폼 만들기"}</button>
    </form>
  );
}
