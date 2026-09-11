import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db, sessions, operators, eq, and, gt, lt } from "@leadmagnet/db";

/**
 * 세션 설계 (ADR-0001 참고)
 * - 쿠키에는 무작위 토큰만 담고, DB에는 토큰의 SHA-256 해시를 저장한다 (DB 유출 시에도 세션 탈취 불가).
 * - HttpOnly + SameSite=Strict + Secure(프로덕션). 관리자 origin 에만 전송되므로
 *   다른 origin(공개 폼)에서 실행되는 스크립트는 이 쿠키에 절대 접근할 수 없다.
 */
import { SESSION_COOKIE } from "./constants";
export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7일

export type CurrentOperator = { id: string; email: string; name: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(operatorId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), operatorId, expiresAt });
  // 만료 세션 정리(가벼운 기회적 GC)
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function resolveSession(token: string | undefined): Promise<CurrentOperator | null> {
  if (!token) return null;
  const rows = await db
    .select({ id: operators.id, email: operators.email, name: operators.name })
    .from(sessions)
    .innerJoin(operators, eq(operators.id, sessions.operatorId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/** Route Handler 용 (NextRequest 기반 — 테스트에서 직접 호출 가능) */
export function getOperatorFromRequest(req: NextRequest) {
  return resolveSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Server Component / Server Action 용 */
export async function getCurrentOperator() {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * 보호된 페이지용. 세션이 없으면 /login 으로 보낸다.
 * (app)/layout 도 같은 검사를 하지만 Next 는 레이아웃과 페이지를 병렬로 렌더링하므로,
 * 페이지가 `getCurrentOperator()!` 로 단언하면 무효 쿠키일 때 null 접근 오류가 먼저 로그에 남는다.
 */
export async function requireCurrentOperator(): Promise<CurrentOperator> {
  const op = await getCurrentOperator();
  if (!op) redirect("/login");
  return op;
}
