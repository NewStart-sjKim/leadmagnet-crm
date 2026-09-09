import { describe, expect, it } from "vitest";
import { extractContact, inspectHtml } from "../src/html";

describe("inspectHtml", () => {
  it("<form>이 있으면 hasForm=true 이고 name 속성을 추출한다", () => {
    const r = inspectHtml(`<html><body><form><input name="email"><select name='job'></select><textarea name=memo></textarea><input type="submit"></form></body></html>`);
    expect(r.hasForm).toBe(true);
    expect(r.fieldNames).toEqual(["email", "job", "memo"]);
    expect(r.hasScript).toBe(false);
  });
  it("<form>이 없으면 hasForm=false", () => {
    expect(inspectHtml("<html><body><h1>hi</h1></body></html>").hasForm).toBe(false);
  });
  it("<script>가 있으면 hasScript=true (경고 표시용)", () => {
    expect(inspectHtml(`<form></form><script>alert(1)</script>`).hasScript).toBe(true);
  });
  it("폼 밖의 input 은 필드로 세지 않는다", () => {
    expect(inspectHtml(`<input name="outside"><form><input name="inside"></form>`).fieldNames).toEqual(["inside"]);
  });
});

describe("extractContact", () => {
  it("흔한 필드 이름(영/한)에서 name/email/phone 을 뽑는다", () => {
    expect(extractContact({ 이름: "홍길동", "E-Mail": "a@b.c", 연락처: "010" })).toEqual({ name: "홍길동", email: "a@b.c", phone: "010" });
  });
  it("없으면 null", () => {
    expect(extractContact({ foo: "bar" })).toEqual({ name: null, email: null, phone: null });
  });
  it("배열 값은 첫 항목을 쓴다", () => {
    expect(extractContact({ email: ["x@y.z", "q@w.e"] }).email).toBe("x@y.z");
  });
});
