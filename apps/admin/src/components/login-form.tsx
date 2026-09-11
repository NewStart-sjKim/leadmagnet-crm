"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeNext } from "@/lib/safe-next";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "로그인에 실패했습니다");
        return;
      }
      router.replace(safeNext(next));
      router.refresh();
    } catch {
      // 네트워크 오류 등 응답 자체를 못 받은 경우 — 버튼을 다시 활성화해야 재시도할 수 있다
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
      <div>
        <label className="label" htmlFor="email">이메일</label>
        <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">비밀번호</label>
        <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? "확인 중…" : "로그인"}</button>
    </form>
  );
}
