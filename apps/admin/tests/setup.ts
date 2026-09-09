import { beforeAll } from "vitest";

// 반드시 DB 클라이언트 import 전에 설정되어야 한다 (setupFiles 는 테스트 파일보다 먼저 실행됨)
const { TEST_DATABASE_URL, migrateTestDb, truncateAll } = await import("@leadmagnet/db/testing");
process.env.DATABASE_URL = TEST_DATABASE_URL;
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.ADMIN_ORIGIN = "http://localhost:3000";
process.env.FORMS_ORIGIN = "http://localhost:3001";

beforeAll(async () => {
  await migrateTestDb();
  await truncateAll();
});
