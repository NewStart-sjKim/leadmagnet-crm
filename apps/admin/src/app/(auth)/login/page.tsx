import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { safeNext } from "@/lib/safe-next";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // 세션이 실제로 유효할 때만 되돌린다. 쿠키만 남은 무효 세션이면 로그인 폼을 보여준다 (미들웨어 주석 참고).
  if (await getCurrentOperator()) redirect(safeNext(next));
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">LM</div>
          <h1 className="text-xl font-semibold">운영자 로그인</h1>
          <p className="mt-1 text-sm text-neutral-500">리드마그넷 CRM 관리자 콘솔</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
