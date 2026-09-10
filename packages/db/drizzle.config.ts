import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
config({ quiet: true });
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
