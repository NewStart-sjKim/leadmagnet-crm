"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  ["DRAFT", "초안"],
  ["ACTIVE", "진행 중"],
  ["PAUSED", "일시중지"],
  ["ARCHIVED", "보관"],
] as const;

export function CampaignStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function change(next: string) {
    setBusy(true);
    await fetch(`/api/admin/campaigns/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    setBusy(false);
    router.refresh();
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-500">상태</span>
      <select className="input w-auto" value={status} disabled={busy} onChange={(e) => change(e.target.value)} data-testid="campaign-status">
        {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
