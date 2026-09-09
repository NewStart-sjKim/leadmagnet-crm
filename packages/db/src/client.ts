import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

function getUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/**
 * 두 앱(admin, forms)이 공유하는 단일 DB 클라이언트.
 * 개발 모드 HMR로 커넥션이 누수되지 않도록 globalThis에 캐시한다.
 * 서버리스(Vercel)에서는 커넥션 수를 작게 유지한다.
 */
export const pgClient =
  globalForDb.__pgClient ??
  postgres(getUrl(), {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Neon/PgBouncer 호환
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = pgClient;

export const db = drizzle(pgClient, { schema, casing: "snake_case" });
export type Db = typeof db;
