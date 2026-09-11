import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * 1차 게이트: 쿠키가 아예 없으면 DB를 건드리지 않고 바로 차단한다.
 * 실제 세션 유효성 검증은 각 Route Handler / 페이지의 requireOperator / getCurrentOperator 에서 수행한다.
 */
export function middleware(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/auth")) {
    // 다른 사이트(예: 공개 폼 origin)에서 시작된 요청은 쿠키가 있어도 거부한다 (CSRF 방어, ADR-0001).
    const fetchSite = req.headers.get("sec-fetch-site");
    const origin = req.headers.get("origin");
    const selfOrigin = req.nextUrl.origin;
    if (fetchSite === "cross-site" || (origin && origin !== selfOrigin && origin !== process.env.ADMIN_ORIGIN)) {
      return NextResponse.json({ error: "Forbidden (cross-site request)" }, { status: 403 });
    }
    if (pathname.startsWith("/api/admin") && !hasCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isProtectedPage = ["/dashboard", "/templates", "/campaigns", "/leads"].some((p) => pathname.startsWith(p));
  if (isProtectedPage && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  // /login 은 쿠키가 있어도 여기서 되돌리지 않는다. 쿠키는 있지만 세션이 무효(만료·DB 초기화)일 때
  // 여기서 /dashboard 로 보내면 (app)/layout 이 다시 /login 으로 보내 무한 이동이 된다.
  // 이미 로그인된 사용자의 /dashboard 이동은 세션을 실제로 검증하는 login 페이지가 맡는다.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
