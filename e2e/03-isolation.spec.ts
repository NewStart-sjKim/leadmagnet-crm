import { test, expect, uploadTemplate, createCampaignWithForm, createLink } from "./fixtures";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ADMIN_URL } from "../playwright.config";

/**
 * 비기능 요구사항: "등록한 HTML 이 관리자 인증 정보나 관리자 API 에 접근하지 못하게"
 * 악의적인 템플릿을 등록하고, 관리자로 로그인된 같은 브라우저에서 공개 폼을 열어
 * (1) 관리자 API 호출이 실패하고 (2) 세션 쿠키를 읽을 수 없음을 확인한다.
 */
const MALICIOUS_HTML = `<!doctype html><html><body>
<form><input name="email"><button>go</button></form>
<pre id="out">pending</pre>
<script>
(async () => {
  const r = { cookie: document.cookie, adminApi: null, adminErr: null };
  try {
    const res = await fetch("${ADMIN_URL}/api/admin/leads", { credentials: "include" });
    r.adminApi = res.status; r.body = await res.text();
  } catch (e) { r.adminErr = String(e && e.name || e); }
  document.getElementById("out").textContent = JSON.stringify(r);
})();
</script></body></html>`;

test("악성 템플릿은 관리자 API 와 세션 쿠키에 접근할 수 없다", async ({ admin }) => {
  const file = path.join(os.tmpdir(), `malicious-${Date.now()}.html`);
  fs.writeFileSync(file, MALICIOUS_HTML);
  await uploadTemplate(admin, file, "악성 템플릿");
  await createCampaignWithForm(admin, "격리 테스트", "격리 폼");
  const url = await createLink(admin, "YOUTUBE");

  // 관리자로 로그인된 *같은 컨텍스트* 에서 공개 폼을 연다 — 최악의 경우를 가정
  const publicPage = await admin.context().newPage();
  await publicPage.goto(url);
  await expect(publicPage.locator("#out")).not.toHaveText("pending");
  const result = JSON.parse((await publicPage.locator("#out").textContent())!);

  // 1) 관리자 세션 쿠키(HttpOnly)는 스크립트에서 보이지 않는다
  expect(result.cookie).not.toContain("lm_admin_session");
  // 2) 관리자 API 호출은 CSP(connect-src 'self') 에 막혀 네트워크 자체가 실패한다
  expect(result.adminApi).toBeNull();
  expect(result.adminErr).toBe("TypeError");

  // 3) 관리자 콘솔의 미리보기 iframe 은 allow-same-origin 이 없는 sandbox 다
  await admin.getByRole("button", { name: "미리보기" }).click();
  const iframe = admin.locator("iframe[title$='미리보기']");
  await expect(iframe).toHaveAttribute("sandbox", "allow-forms allow-scripts");
  expect(await iframe.getAttribute("src")).toMatch(/^http:\/\/localhost:3101\/p\//);
  await publicPage.close();
});

test("관리자 API 는 다른 origin 에서 온 요청을 403 으로 거부한다 (CSRF)", async ({ admin, request }) => {
  // 로그인 쿠키를 가진 채로 Origin 헤더만 위조
  const cookies = await admin.context().cookies(ADMIN_URL);
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await request.get(`${ADMIN_URL}/api/admin/campaigns`, {
    headers: { cookie, origin: "http://localhost:3101", "sec-fetch-site": "cross-site" },
  });
  expect(res.status()).toBe(403);
  const ok = await request.get(`${ADMIN_URL}/api/admin/campaigns`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  expect(ok.status()).toBe(200);
});
