"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function TemplateUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg({ type: "err", text: ".html 파일을 선택해 주세요" });
    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    if (name.trim()) fd.append("name", name.trim());
    const res = await fetch("/api/admin/templates", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setMsg({ type: "err", text: body.error ?? "등록에 실패했습니다" });
    setMsg({ type: "ok", text: `등록 완료: ${body.template.name}${body.warnings?.length ? ` — ${body.warnings[0]}` : ""}` });
    setName("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  function close() {
    setOpen(false);
    setMsg(null);
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)} data-testid="open-template-upload">
        + 새 템플릿 등록
      </button>

      <Modal open={open} onClose={close} title="새 템플릿 등록">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="template-upload">
          <div>
            <label className="label" htmlFor="tpl-name">이름 (선택)</label>
            <input id="tpl-name" className="input" placeholder="예: 무료 전자책 신청 폼" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tpl-file">HTML 파일</label>
            <input id="tpl-file" ref={fileRef} type="file" accept=".html,.htm,text/html" className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:text-white" />
            <p className="mt-1 text-xs text-neutral-500">단일 파일, 512KB 이하. 제출 처리는 시스템이 자동으로 연결합니다.</p>
          </div>
          {/* 등록 후에도 모달을 열어 둔다 — 여러 개를 연달아 올릴 수 있고, 결과 메시지가 여기 남는다 */}
          {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} role="status">{msg.text}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={close}>닫기</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "등록 중…" : "등록"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
