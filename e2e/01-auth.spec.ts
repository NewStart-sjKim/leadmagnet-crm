import { test, expect } from "./fixtures";
import { E2E_OPERATOR } from "./global-setup";

test.describe("인증 (실패 흐름 포함)", () => {
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
