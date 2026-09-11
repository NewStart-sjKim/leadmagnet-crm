import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
config({ quiet: true });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const here = path.dirname(fileURLToPath(import.meta.url));
// prepare: false — Neon 풀러(PgBouncer) 경유로도 마이그레이션이 되도록 앱 클라이언트(client.ts)와 맞춘다
const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
  console.log("✔ migrations applied");
} finally {
  await client.end();
}
