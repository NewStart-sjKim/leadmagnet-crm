import { describe, expect, it, beforeEach } from "vitest";
import { truncateAll } from "@leadmagnet/db/testing";
import { GET as list, POST as upload } from "@/app/api/admin/templates/route";
import { GET as detail, DELETE as remove } from "@/app/api/admin/templates/[id]/route";
import { createOperator, loginAs, req, ctx, htmlFile, SAMPLE_HTML } from "./helpers";

async function uploadFile(cookie: string, file: File, name?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (name) fd.append("name", name);
  return upload(req("/api/admin/templates", { method: "POST", body: fd, cookie }), undefined as never);
}

describe("HTML 템플릿 등록", () => {
  let cookie: string;
  beforeEach(async () => {
    await truncateAll();
    const op = await createOperator();
    cookie = await loginAs(op.email, op.password);
  });

  it("단일 .html 파일을 등록하면 201 과 함께 필드 이름이 추출된다", async () => {
    const res = await uploadFile(cookie, htmlFile(SAMPLE_HTML), "전자책 폼");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.template.name).toBe("전자책 폼");
    expect(body.template.fieldNames).toEqual(["name", "email"]);
    const l = await (await list(req("/api/admin/templates", { cookie }), undefined as never)).json();
    expect(l.templates).toHaveLength(1);
  });

  it("<form> 이 없는 HTML 은 400", async () => {
    const res = await uploadFile(cookie, htmlFile("<html><body>no form</body></html>"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("<form>");
  });

  it(".html 이 아닌 파일은 400", async () => {
    const res = await uploadFile(cookie, htmlFile(SAMPLE_HTML, "form.txt"));
    expect(res.status).toBe(400);
  });

  it("빈 파일은 400", async () => {
    expect((await uploadFile(cookie, htmlFile(""))).status).toBe(400);
  });

  it("file 필드가 없으면 400", async () => {
    const fd = new FormData();
    fd.append("name", "x");
    expect((await upload(req("/api/admin/templates", { method: "POST", body: fd, cookie }), undefined as never)).status).toBe(400);
  });

  it("<script> 가 포함되면 등록은 되지만 경고를 돌려준다", async () => {
    const res = await uploadFile(cookie, htmlFile(`<form><input name="a"></form><script>fetch('/x')</script>`));
    expect(res.status).toBe(201);
    expect((await res.json()).warnings).toHaveLength(1);
  });

  it("다른 운영자의 템플릿은 조회/삭제할 수 없다 (404)", async () => {
    const mine = await (await uploadFile(cookie, htmlFile(SAMPLE_HTML))).json();
    const other = await createOperator("other@test.dev");
    const otherCookie = await loginAs(other.email, other.password);
    expect((await detail(req(`/api/admin/templates/${mine.template.id}`, { cookie: otherCookie }), ctx({ id: mine.template.id }))).status).toBe(404);
    expect((await remove(req(`/api/admin/templates/${mine.template.id}`, { method: "DELETE", cookie: otherCookie }), ctx({ id: mine.template.id }))).status).toBe(404);
  });

  it("미인증 업로드는 401", async () => {
    const fd = new FormData();
    fd.append("file", htmlFile(SAMPLE_HTML));
    expect((await upload(req("/api/admin/templates", { method: "POST", body: fd }), undefined as never)).status).toBe(401);
  });
});
