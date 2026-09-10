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
const client = postgres(url, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
  console.log("✔ migrations applied");
} finally {
  await client.end();
}
