"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateForm({ campaignId, templates }: { campaignId: string; templates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    router.refresh();
  }

  // 템플릿이 없으면 폼을 만들 수 없다 (서버도 404 로 막는다)
  const noTemplate = templates.length === 0;

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen(true)}
        disabled={noTemplate}
        title={noTemplate ? "먼저 HTML 템플릿을 등록해 주세요" : undefined}
        data-testid="open-create-form"
      >
        + 새 신청 폼
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="새 신청 폼">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="create-form">
          <div>
            <label className="label" htmlFor="f-title">폼 제목</label>
            <input id="f-title" className="input" required placeholder="예: 전자책 신청" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-template">HTML 템플릿</label>
            <select id="f-template" className="input" required value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={noTemplate}>
              {noTemplate && <option value="">등록된 템플릿이 없습니다</option>}
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-success">완료 메시지 (선택)</label>
            <input id="f-success" className="input" placeholder="신청이 완료되었습니다. 감사합니다!" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>취소</button>
            <button type="submit" className="btn-primary" disabled={busy || noTemplate}>{busy ? "생성 중…" : "폼 만들기"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
