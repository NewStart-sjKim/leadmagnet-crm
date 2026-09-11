import { describe, expect, it, beforeEach } from "vitest";
import { db, visits, leads } from "@leadmagnet/db";
import { truncateAll } from "@leadmagnet/db/testing";
import { GET as serve } from "@/app/f/[slug]/route";
import { GET as preview } from "@/app/p/[slug]/route";
import { POST as submit } from "@/app/api/public/forms/[slug]/submit/route";
import { seedForm, req, jsonReq, ctx, cookieOf } from "./helpers";

describe("공개 폼 서빙 (GET /f/:slug)", () => {
  beforeEach(truncateAll);

  it("HTML 스냅샷에 브릿지가 주입되고 visitor 쿠키가 발급되며 방문이 기록된다", async () => {
    const { form, ig } = await seedForm();
    const res = await serve(req(`/f/${form.slug}?c=${ig.code}`), ctx(form.slug));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("<h1>신청</h1>");
    expect(html).toContain('<script src="/lm-bridge.js" defer></script>');
    expect(html).toContain(`"slug":"${form.slug}"`);
    expect(html).toContain(`"code":"${ig.code}"`);
    expect(html).toContain('"preview":false');
    // 브릿지는 </body> 앞에 들어간다
    expect(html.indexOf("lm-bridge.js")).toBeLessThan(html.indexOf("</body>"));

    const vid = cookieOf(res, "lm_vid");
    expect(vid).toMatch(/^lm_vid=[0-9a-f-]{36}$/);
    const raw = res.headers.get("set-cookie")!.toLowerCase();
    expect(raw).toContain("httponly");

    const rows = await db.select().from(visits);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.linkId).toBe(ig.id);
    expect(rows[0]!.visitorId).toBe(vid!.split("=")[1]);
  });

  it("같은 visitor 쿠키로 다시 방문하면 새 방문이 기록되지만 visitorId 는 유지된다", async () => {
    const { form } = await seedForm();
    const first = await serve(req(`/f/${form.slug}`), ctx(form.slug));
    const vid = cookieOf(first, "lm_vid")!;
    await serve(req(`/f/${form.slug}`, { cookie: vid }), ctx(form.slug));
    const rows = await db.select().from(visits);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.visitorId)).size).toBe(1);
  });

  it("알 수 없는 링크 코드는 채널 없이(직접 유입) 기록된다", async () => {
    const { form } = await seedForm();
    await serve(req(`/f/${form.slug}?c=does_not_exist`), ctx(form.slug));
    const [v] = await db.select().from(visits);
    expect(v!.linkId).toBeNull();
  });

  it("존재하지 않는 slug 는 404 이고 방문이 기록되지 않는다", async () => {
    const res = await serve(req(`/f/nope`), ctx("nope"));
    expect(res.status).toBe(404);
    expect(await db.select().from(visits)).toHaveLength(0);
  });

  it("비활성 폼 / 일시중지·보관 캠페인은 410 (마감)", async () => {
    const a = await seedForm({ isActive: false });
    expect((await serve(req(`/f/${a.form.slug}`), ctx(a.form.slug))).status).toBe(410);
    const b = await seedForm({ campaignStatus: "PAUSED" });
    expect((await serve(req(`/f/${b.form.slug}`), ctx(b.form.slug))).status).toBe(410);
    const c = await seedForm({ campaignStatus: "ARCHIVED" });
    expect((await serve(req(`/f/${c.form.slug}`), ctx(c.form.slug))).status).toBe(410);
    expect(await db.select().from(visits)).toHaveLength(0);
  });

  it("미리보기(/p/:slug)는 방문을 기록하지 않고 preview 모드로 주입된다", async () => {
    const { form } = await seedForm({ isActive: false });
    const res = await preview(req(`/p/${form.slug}`), ctx(form.slug));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"preview":true');
    expect(await db.select().from(visits)).toHaveLength(0);
  });
});

describe("보안 격리 (ADR-0001)", () => {
  beforeEach(truncateAll);

  it("응답에 CSP 가 있고 connect-src/form-action 이 self 로 제한되며 frame-ancestors 는 관리자 origin 만 허용한다", async () => {
    const { form } = await seedForm();
    const res = await serve(req(`/f/${form.slug}`), ctx(form.slug));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self' http://localhost:3000");
    expect(csp).toContain("object-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("공개 폼 응답은 관리자 세션 쿠키를 절대 발급하지 않는다", async () => {
    const { form } = await seedForm();
    const res = await serve(req(`/f/${form.slug}`), ctx(form.slug));
    const cookies = res.headers.getSetCookie().join(" ");
    expect(cookies).not.toContain("lm_admin_session");
  });

  it("업로드된 HTML 의 스크립트는 그대로 유지되되(정화하지 않음) 주입 설정값은 </script> 탈출이 불가능하다", async () => {
    const html = `<form><input name="a"></form><script>window.evil=1</script>`;
    const { form } = await seedForm({ html, slug: "x-slug" });
    // successMessage 에 </script> 를 넣어도 이스케이프되어야 한다
    await db.update((await import("@leadmagnet/db")).forms).set({ successMessage: "</script><script>alert(1)</script>" });
    const out = await (await serve(req(`/f/x-slug`), ctx("x-slug"))).text();
    expect(out).toContain("window.evil=1"); // 운영자 스크립트는 보존
    expect(out).toContain('\\u003c/script>'); // 설정값 내부의 < 는 이스케이프
    expect(out.match(/<\/script>/g)!.length).toBe(3); // 운영자 1 + 주입 2 (탈출로 추가된 태그 없음)
  });
});

describe("제출 (POST /api/public/forms/:slug/submit)", () => {
  beforeEach(truncateAll);

  it("필드를 payload 로 저장하고 연락처 컬럼을 승격하며 링크/방문자를 귀속한다", async () => {
    const { form, ig } = await seedForm();
    const visit = await serve(req(`/f/${form.slug}?c=${ig.code}`), ctx(form.slug));
    const vid = cookieOf(visit, "lm_vid")!;
    const res = await submit(
      jsonReq(`/api/public/forms/${form.slug}/submit`, { code: ig.code, fields: { 이름: "홍길동", email: "h@x.io", topics: ["a", "b"] } }, vid),
      ctx(form.slug),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, message: "완료!" });
    const [lead] = await db.select().from(leads);
    expect(lead).toMatchObject({ formId: form.id, linkId: ig.id, visitorId: vid.split("=")[1], name: "홍길동", email: "h@x.io", phone: null });
    expect(lead!.payload).toEqual({ 이름: "홍길동", email: "h@x.io", topics: ["a", "b"] });
  });

  it("빈 fields 는 400", async () => {
    const { form } = await seedForm();
    expect((await submit(jsonReq(`/api/public/forms/${form.slug}/submit`, { fields: {} }), ctx(form.slug))).status).toBe(400);
  });

  it("JSON 이 아니면 400", async () => {
    const { form } = await seedForm();
    const res = await submit(req(`/api/public/forms/${form.slug}/submit`, { method: "POST", body: "name=x", headers: { "content-type": "text/plain" } }), ctx(form.slug));
    expect(res.status).toBe(400);
  });

  it("존재하지 않는 폼은 404, 마감된 폼은 410 이며 리드가 저장되지 않는다", async () => {
    expect((await submit(jsonReq(`/api/public/forms/nope/submit`, { fields: { a: "1" } }), ctx("nope"))).status).toBe(404);
    const { form } = await seedForm({ campaignStatus: "PAUSED" });
    expect((await submit(jsonReq(`/api/public/forms/${form.slug}/submit`, { fields: { a: "1" } }), ctx(form.slug))).status).toBe(410);
    expect(await db.select().from(leads)).toHaveLength(0);
  });

  it("너무 큰 본문은 413", async () => {
    const { form } = await seedForm();
    const r = jsonReq(`/api/public/forms/${form.slug}/submit`, { fields: { a: "x" } });
    r.headers.set("content-length", String(10 * 1024 * 1024));
    expect((await submit(r, ctx(form.slug))).status).toBe(413);
  });

  it("Content-Length 가 없어도(청크 전송) 실제 본문이 64KB 를 넘으면 413", async () => {
    const { form } = await seedForm();
    const r = jsonReq(`/api/public/forms/${form.slug}/submit`, { fields: { a: "x".repeat(70 * 1024) } });
    expect(r.headers.get("content-length")).toBeNull(); // 헤더만 믿으면 우회된다
    expect((await submit(r, ctx(form.slug))).status).toBe(413);
  });

  it("필드 값 길이 제한(5000자)을 넘으면 400", async () => {
    const { form } = await seedForm();
    expect((await submit(jsonReq(`/api/public/forms/${form.slug}/submit`, { fields: { a: "x".repeat(5001) } }), ctx(form.slug))).status).toBe(400);
  });
});
