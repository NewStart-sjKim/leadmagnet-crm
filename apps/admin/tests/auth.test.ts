import { describe, expect, it, beforeEach } from "vitest";
import { truncateAll } from "@leadmagnet/db/testing";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listCampaigns } from "@/app/api/admin/campaigns/route";
import { createOperator, jsonReq, req, loginAs } from "./helpers";

describe("인증", () => {
  beforeEach(truncateAll);

  it("올바른 자격증명으로 로그인하면 HttpOnly/SameSite=Strict 세션 쿠키가 발급된다", async () => {
    const op = await createOperator();
    const res = await login(jsonReq("/api/auth/login", { email: op.email, password: op.password }), undefined as never);
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^lm_admin_session=/);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
  });

  it("잘못된 비밀번호는 401 이며 쿠키가 발급되지 않는다", async () => {
    const op = await createOperator();
    const res = await login(jsonReq("/api/auth/login", { email: op.email, password: "wrong" }), undefined as never);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("존재하지 않는 이메일도 동일하게 401 (계정 존재 여부 비노출)", async () => {
    const res = await login(jsonReq("/api/auth/login", { email: "nobody@test.dev", password: "x" }), undefined as never);
    expect(res.status).toBe(401);
  });

  it("형식이 잘못된 본문은 400", async () => {
    const res = await login(jsonReq("/api/auth/login", { email: "not-an-email" }), undefined as never);
    expect(res.status).toBe(400);
  });

  it("세션 없이 관리자 API 를 호출하면 401", async () => {
    const res = await listCampaigns(req("/api/admin/campaigns"), undefined as never);
    expect(res.status).toBe(401);
  });

  it("위조된 세션 토큰은 401", async () => {
    const res = await me(req("/api/auth/me", { cookie: "lm_admin_session=forged-token" }), undefined as never);
    expect(res.status).toBe(401);
  });

  it("로그아웃 후에는 같은 쿠키로 접근할 수 없다", async () => {
    const op = await createOperator();
    const cookie = await loginAs(op.email, op.password);
    expect((await me(req("/api/auth/me", { cookie }), undefined as never)).status).toBe(200);
    await logout(req("/api/auth/logout", { method: "POST", cookie }), undefined as never);
    expect((await me(req("/api/auth/me", { cookie }), undefined as never)).status).toBe(401);
  });
});
