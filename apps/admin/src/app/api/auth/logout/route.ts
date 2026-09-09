import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { SESSION_COOKIE, destroySession } from "@/lib/session";

/** POST /api/auth/logout — 세션 삭제 */
export const POST = handler(async (req) => {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...{ httpOnly: true, sameSite: "strict", path: "/" }, maxAge: 0 });
  return res;
});
