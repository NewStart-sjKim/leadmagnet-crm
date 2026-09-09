import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { loginSchema } from "@leadmagnet/shared";
import { db, operators, eq } from "@leadmagnet/db";
import { ApiError, handler, parseJson } from "@/lib/api";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/lib/session";

/** POST /api/auth/login — 이메일/비밀번호로 로그인, 세션 쿠키 발급 */
export const POST = handler(async (req) => {
  const { email, password } = await parseJson(req, loginSchema);

  const [op] = await db.select().from(operators).where(eq(operators.email, email.toLowerCase())).limit(1);
  // 사용자 존재 여부를 노출하지 않도록 동일한 메시지/타이밍
  const ok = op ? await bcrypt.compare(password, op.passwordHash) : await bcrypt.compare(password, "$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalid");
  if (!op || !ok) throw new ApiError(401, "이메일 또는 비밀번호가 올바르지 않습니다");

  const { token, expiresAt } = await createSession(op.id);
  const res = NextResponse.json({ operator: { id: op.id, email: op.email, name: op.name } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
});
