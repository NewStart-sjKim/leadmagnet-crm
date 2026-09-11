import { test, expect } from "./fixtures";
import { E2E_OPERATOR } from "./global-setup";
import { ADMIN_URL } from "../playwright.config";

test.describe("인증 (실패 흐름 포함)", () => {
  test("무효한 세션 쿠키가 남아 있어도 로그인 화면이 뜬다 (로그인 ↔ 대시보드 무한 이동 없음)", async ({ page }) => {
    // 만료됐거나 DB 초기화로 사라진 세션의 쿠키만 브라우저에 남은 상황
    await page.context().addCookies([{ name: "lm_admin_session", value: "stale-or-forged-token", url: ADMIN_URL }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("[data-testid=login-form]")).toBeVisible();
    await page.goto("/login");
    await expect(page.locator("[data-testid=login-form]")).toBeVisible();
  });

  test("이미 로그인된 상태로 /login 에 가면 대시보드로 보낸다", async ({ admin }) => {
    await admin.goto("/login");
    await expect(admin).toHaveURL(/\/dashboard/);
  });

  test("로그인 후 next 가 외부 주소(//host)면 무시하고 대시보드로 간다", async ({ page }) => {
    await page.goto("/login?next=//evil.example/phish");
    await page.fill("#email", E2E_OPERATOR.email);
    await page.fill("#password", E2E_OPERATOR.password);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard");
    expect(new URL(page.url()).origin).toBe(ADMIN_URL);
  });

  test("로그인 요청이 네트워크 오류로 실패하면 안내를 보여주고 버튼이 다시 활성화된다", async ({ page }) => {
    await page.goto("/login");
    await page.route("**/api/auth/login", (route) => route.abort("connectionfailed"));
    await page.fill("#email", E2E_OPERATOR.email);
    await page.fill("#password", E2E_OPERATOR.password);
    await page.click("button[type=submit]");
    await expect(page.locator("[data-testid=login-form] [role=alert]")).toContainText("연결할 수 없습니다");
    await expect(page.locator("button[type=submit]")).toBeEnabled();
  });

  test("로그인 없이 관리자 페이지에 가면 /login 으로 보내진다", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("잘못된 비밀번호는 오류 메시지를 보여주고 머문다", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", E2E_OPERATOR.email);
    await page.fill("#password", "wrong-password");
    await page.click("button[type=submit]");
    await expect(page.locator("[data-testid=login-form] [role=alert]")).toContainText("올바르지 않습니다");
    await expect(page).toHaveURL(/\/login/);
  });

  test("로그인 → 대시보드 → 로그아웃", async ({ admin }) => {
    await expect(admin.getByRole("heading", { name: "대시보드" })).toBeVisible();
    await admin.getByRole("button", { name: "로그아웃" }).click();
    await admin.waitForURL("**/login");
    await admin.goto("/dashboard");
    await expect(admin).toHaveURL(/\/login/);
  });
});
