import { test, expect, uploadTemplate, createCampaignWithForm, createLink, SAMPLE_FORM } from "./fixtures";

/**
 * 핵심 성공 흐름:
 * 템플릿 등록 → 캠페인/폼 생성 → 인스타그램 링크 → 방문자가 링크로 들어와 신청 → 대시보드에서 전환 확인
 */
test("운영자가 폼을 만들고 배포한 뒤 실제 전환 데이터를 확인한다", async ({ admin, browser }) => {
  await uploadTemplate(admin, SAMPLE_FORM, "E2E 전자책 폼");
  await createCampaignWithForm(admin, "E2E 캠페인", "E2E 전자책 신청");
  const igUrl = await createLink(admin, "INSTAGRAM");
  const xUrl = await createLink(admin, "X");
  expect(igUrl).toMatch(/^http:\/\/localhost:3101\/f\/[a-z0-9-]+\?c=ig_/);
  expect(xUrl).toMatch(/\?c=x_/);

  // 방문자 1: 인스타 링크 → 두 번 열고(방문 2) 신청 1
  const v1 = await browser.newContext();
  const p1 = await v1.newPage();
  await p1.goto(igUrl);
  await expect(p1.getByRole("heading", { name: /무료 전자책/ })).toBeVisible();
  await p1.reload();
  await p1.fill("#name", "김방문");
  await p1.fill("#email", "visitor1@example.com");
  await p1.fill("#phone", "010-1111-2222");
  await p1.check("#agree");
  await p1.click("button[type=submit]");
  await expect(p1.locator("[data-lm-success]")).toContainText("신청이 완료되었습니다");
  await v1.close();

  // 방문자 2: X 링크 → 보기만 함 (이탈)
  const v2 = await browser.newContext();
  const p2 = await v2.newPage();
  await p2.goto(xUrl);
  await expect(p2.locator("form[data-lm-bound]")).toBeVisible();
  await v2.close();

  // 대시보드: 방문 3, 방문자 2, 신청 1, 전환율 50%
  await admin.goto("/dashboard");
  const row = admin.locator("[data-testid=campaign-stat-row]").filter({ hasText: "E2E 캠페인" });
  await expect(row.locator("td").nth(3)).toHaveText("3");
  await expect(row.locator("td").nth(4)).toHaveText("2");
  await expect(row.locator("td").nth(5)).toHaveText("1");
  await expect(row.locator("td").nth(6)).toHaveText("50.0%");

  // 채널별: 인스타 방문 2/방문자 1/신청 1/100%, X 방문 1/방문자 1/신청 0/0%
  const ig = admin.locator("[data-testid=channel-row-INSTAGRAM]");
  await expect(ig.locator("td").nth(1)).toHaveText("2");
  await expect(ig.locator("td").nth(3)).toHaveText("1");
  await expect(ig.locator("td").nth(4)).toHaveText("100.0%");
  const x = admin.locator("[data-testid=channel-row-X]");
  await expect(x.locator("td").nth(1)).toHaveText("1");
  await expect(x.locator("td").nth(3)).toHaveText("0");

  // CRM 명단에 신청자가 있고 채널이 귀속되어 있다
  await admin.goto("/leads");
  const lead = admin.locator("[data-testid=lead-row]").first();
  await expect(lead).toContainText("김방문");
  await expect(lead).toContainText("visitor1@example.com");
  await expect(lead).toContainText("인스타그램");
});

test("마감(일시중지)된 캠페인의 폼은 방문자에게 410 안내가 보이고 신청이 막힌다", async ({ admin, browser }) => {
  await uploadTemplate(admin, SAMPLE_FORM, "마감 테스트 폼");
  await createCampaignWithForm(admin, "마감 캠페인", "마감 폼");
  const url = await createLink(admin, "THREADS");
  await admin.selectOption("[data-testid=campaign-status]", "PAUSED");
  await expect(admin.locator("[data-testid=campaign-status]")).toHaveValue("PAUSED");

  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const res = await p.goto(url);
  expect(res!.status()).toBe(410);
  await expect(p.getByRole("heading", { name: "신청이 마감되었습니다" })).toBeVisible();
  await ctx.close();
});
