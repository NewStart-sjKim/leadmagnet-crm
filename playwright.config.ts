import { defineConfig, devices } from "@playwright/test";

/**
 * E2E: 별도 포트(3100/3101)와 테스트 DB 로 admin/forms 두 서버를 띄운다.
 * 두 서버는 서로 다른 origin 이어야 보안 시나리오가 의미가 있다.
 */
export const ADMIN_URL = "http://localhost:3100";
export const FORMS_URL = "http://localhost:3101";
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leadmagnet_test";

const env = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  ADMIN_ORIGIN: ADMIN_URL,
  FORMS_ORIGIN: FORMS_URL,
  NODE_ENV: "development",
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: ADMIN_URL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  webServer: [
    {
      command: "pnpm --filter @leadmagnet/admin exec next dev -p 3100",
      url: `${ADMIN_URL}/login`,
      env,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @leadmagnet/forms exec next dev -p 3101",
      url: `${FORMS_URL}/`,
      env,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
