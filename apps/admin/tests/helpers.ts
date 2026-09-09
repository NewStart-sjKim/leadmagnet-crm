import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { db, operators } from "@leadmagnet/db";
import { POST as login } from "@/app/api/auth/login/route";

export const BASE = "http://localhost:3000";

export function req(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(new URL(path, BASE), { ...init, headers } as never);
}

export function jsonReq(path: string, body: unknown, init: { method?: string; cookie?: string } = {}) {
  return req(path, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cookie: init.cookie,
  });
}

export const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

export async function createOperator(email = "op@test.dev", password = "secret123!") {
  const [op] = await db.insert(operators).values({ email, passwordHash: await bcrypt.hash(password, 4), name: "테스트 운영자" }).returning();
  return { ...op!, password };
}

/** 로그인해서 쿠키 헤더 문자열을 돌려준다 */
export async function loginAs(email: string, password: string) {
  const res = await login(jsonReq("/api/auth/login", { email, password }), undefined as never);
  expectStatus(res, 200);
  const set = res.headers.get("set-cookie")!;
  return set.split(";")[0]!; // "lm_admin_session=..."
}

export function expectStatus(res: Response, status: number) {
  if (res.status !== status) throw new Error(`expected ${status}, got ${res.status}`);
}

export function htmlFile(html: string, name = "form.html") {
  return new File([html], name, { type: "text/html" });
}

export const SAMPLE_HTML = `<!doctype html><html><body><h1>신청</h1><form><input name="name" required><input name="email" type="email"><button>보내기</button></form></body></html>`;
