import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Client = ReturnType<typeof postgres>;
type Database = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __lmPg?: Client; __lmDb?: Database };

/**
 * 두 앱(admin, forms)이 공유하는 단일 DB 클라이언트.
 * - 첫 사용 시점에 연결한다 (next build 의 페이지 데이터 수집 단계에서 DATABASE_URL 없이 import 가능)
 * - 개발 모드 HMR 로 커넥션이 누수되지 않도록 globalThis 에 캐시한다
 * - 서버리스(Vercel)에서는 커넥션 수를 작게 유지한다
 */
function getClient(): Client {
  if (g.__lmPg) return g.__lmPg;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  g.__lmPg = postgres(url, {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Neon/PgBouncer 호환
    onnotice: () => {},
  });
  return g.__lmPg;
}

function getDb(): Database {
  if (g.__lmDb) return g.__lmDb;
  g.__lmDb = drizzle(getClient(), { schema, casing: "snake_case" });
  return g.__lmDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export const pgClient = {
  /** 스크립트 종료 시 커넥션 정리용 */
  end: () => (g.__lmPg ? g.__lmPg.end() : Promise.resolve()),
};

export type Db = Database;
