import { test as base, expect, type Page } from "@playwright/test";
import path from "node:path";
import { E2E_OPERATOR } from "./global-setup";

export { expect };

export const test = base.extend<{ admin: Page }>({
  /** 로그인된 관리자 페이지 */
  admin: async ({ page }, use) => {
    await page.goto("/login");
    await page.fill("#email", E2E_OPERATOR.email);
    await page.fill("#password", E2E_OPERATOR.password);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard");
    await use(page);
  },
});

export const SAMPLE_FORM = path.resolve(__dirname, "../examples/sample-ebook-form.html");

export async function uploadTemplate(admin: Page, filePath: string, name: string) {
  await admin.goto("/templates");
  await admin.fill("#tpl-name", name);
  await admin.setInputFiles("#tpl-file", filePath);
  await admin.click('[data-testid=template-upload] button[type=submit]');
  await expect(admin.getByRole("status")).toContainText("등록 완료");
}

export async function createCampaignWithForm(admin: Page, campaignName: string, formTitle: string) {
  await admin.goto("/campaigns");
  await admin.fill("#c-name", campaignName);
  await admin.click('[data-testid=create-campaign] button[type=submit]');
  await admin.waitForURL(/\/campaigns\/[^/]+$/);
  await admin.fill("#f-title", formTitle);
  await admin.click('[data-testid=create-form] button[type=submit]');
  await expect(admin.locator("[data-testid=form-card]")).toHaveCount(1);
}

export async function createLink(admin: Page, channel: "INSTAGRAM" | "X" | "YOUTUBE" | "THREADS") {
  const before = await admin.locator("[data-testid=link-item]").count();
  await admin.click(`[data-testid=create-link-${channel}]`);
  await expect(admin.locator("[data-testid=link-item]")).toHaveCount(before + 1);
  const item = admin.locator("[data-testid=link-item]").nth(before);
  return (await item.locator("code").textContent())!.trim();
}
