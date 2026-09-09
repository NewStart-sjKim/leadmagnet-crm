"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CurrentOperator } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/campaigns", label: "캠페인 · 폼" },
  { href: "/templates", label: "HTML 템플릿" },
  { href: "/leads", label: "CRM 명단" },
];

export function Sidebar({ operator }: { operator: CurrentOperator }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white">LM</div>
        <div className="text-sm font-semibold leading-tight">리드마그넷 CRM</div>
      </div>
      <nav className="flex-1 space-y-0.5">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
              {n.label}
            </Link>
          );
        })}
        <a href="/api-docs" className="block rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100">API 문서</a>
      </nav>
      <div className="border-t border-neutral-200 pt-3 text-xs text-neutral-500">
        <div className="truncate px-2 font-medium text-neutral-800">{operator.name}</div>
        <div className="truncate px-2">{operator.email}</div>
        <button onClick={logout} className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-neutral-600 hover:bg-neutral-100">로그아웃</button>
      </div>
    </aside>
  );
}
