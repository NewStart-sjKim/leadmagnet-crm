/**
 * 테스트 전용 헬퍼. 앱 테스트의 setupFiles 에서 사용한다.
 * - TEST_DATABASE_URL (기본: 로컬 leadmagnet_test) 로 마이그레이션 적용
 * - 모든 테이블 TRUNCATE
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 루트 .env 의 TEST_DATABASE_URL 을 읽는다 (README: "TEST_DATABASE_URL 로 바꿀 수 있습니다").
// 셸 환경변수가 이미 있으면 그쪽이 우선한다 (dotenv 는 기존 값을 덮어쓰지 않음).
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leadmagnet_test";

export async function migrateTestDb() {
  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
  } finally {
    await client.end();
  }
}

export async function truncateAll() {
  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(
      `TRUNCATE TABLE leads, visits, distribution_links, forms, campaigns, html_templates, sessions, operators RESTART IDENTITY CASCADE`,
    );
  } finally {
    await client.end();
  }
}
