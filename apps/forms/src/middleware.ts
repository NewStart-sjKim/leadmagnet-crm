import { NextResponse, type NextRequest } from "next/server";

/**
 * 공개 폼 origin 의 전역 보안 헤더.
 * 이 origin 에는 관리자 세션이 존재하지 않으며, 관리자 API 도 없다 (ADR-0001).
 */
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|lm-bridge.js).*)"] };
