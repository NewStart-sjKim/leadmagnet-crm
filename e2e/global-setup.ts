import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leadmagnet_test";
export const E2E_OPERATOR = { email: "e2e@test.dev", password: "e2e-pass-123!" };

/** 테스트 DB 마이그레이션 → 초기화 → E2E 운영자 시드 */
export default async function globalSetup() {
  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: path.resolve(__dirname, "../packages/db/drizzle") });
    await sql.unsafe(`TRUNCATE TABLE leads, visits, distribution_links, forms, campaigns, html_templates, sessions, operators RESTART IDENTITY CASCADE`);
    await sql`insert into operators (email, password_hash, name) values (${E2E_OPERATOR.email}, ${await bcrypt.hash(E2E_OPERATOR.password, 4)}, 'E2E 운영자')`;
  } finally {
    await sql.end();
  }
}
