import { beforeAll } from "vitest";

const { TEST_DATABASE_URL, migrateTestDb, truncateAll } = await import("@leadmagnet/db/testing");
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.ADMIN_ORIGIN = "http://localhost:3000";
process.env.FORMS_ORIGIN = "http://localhost:3001";

beforeAll(async () => {
  await migrateTestDb();
  await truncateAll();
});
