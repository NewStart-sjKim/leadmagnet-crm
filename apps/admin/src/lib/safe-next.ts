/**
 * 로그인 후 이동할 경로. 같은 사이트 안의 경로만 허용한다.
 * "/" 로 시작해야 하고, "//host" (프로토콜 상대 URL) 나 "/\host" (브라우저가 // 로 정규화) 는 외부 이동이 되므로 거부한다.
 *
 * 서버 컴포넌트(login/page.tsx)와 클라이언트 컴포넌트(login-form.tsx) 양쪽에서 쓰므로
 * "use client" 가 없는 일반 모듈에 둔다 — 클라이언트 모듈의 export 는 서버에서 호출할 수 없다.
 */
export function safeNext(next: string | undefined | null): string {
  if (!next || !next.startsWith("/")) return "/dashboard";
  const second = next.charAt(1);
  if (second === "/" || second === String.fromCharCode(92)) return "/dashboard";
  return next;
}
