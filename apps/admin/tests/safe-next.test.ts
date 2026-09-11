import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

const BS = String.fromCharCode(92); // 백슬래시

describe("safeNext — 로그인 후 이동 경로 검증", () => {
  it("같은 사이트의 경로는 그대로 쓴다", () => {
    expect(safeNext("/campaigns")).toBe("/campaigns");
    expect(safeNext("/campaigns/abc?tab=links")).toBe("/campaigns/abc?tab=links");
    expect(safeNext("/")).toBe("/");
  });

  it("없거나 비어 있으면 대시보드", () => {
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });

  it("외부 주소는 거부한다 — 절대 URL, 프로토콜 상대 URL, 백슬래시 변형", () => {
    expect(safeNext("https://evil.example/phish")).toBe("/dashboard");
    expect(safeNext("//evil.example/phish")).toBe("/dashboard");
    expect(safeNext("/" + BS + "evil.example")).toBe("/dashboard"); // 브라우저가 // 로 정규화하는 형태
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
  });
});
