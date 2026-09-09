import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
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
