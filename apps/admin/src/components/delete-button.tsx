"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({ url, confirmText, label = "삭제" }: { url: string; confirmText: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function onClick() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "삭제 실패");
      return;
    }
    router.refresh();
  }
  return (
    <div className="shrink-0 text-right">
      <button onClick={onClick} disabled={busy} className="btn-danger">{label}</button>
      {err && <div className="mt-1 max-w-[200px] text-xs text-red-600">{err}</div>}
    </div>
  );
}
