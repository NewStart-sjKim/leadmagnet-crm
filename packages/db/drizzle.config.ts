import { config } from "dotenv";
config({ path: new URL("../../.env", import.meta.url).pathname, quiet: true });
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
