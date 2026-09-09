import { config } from "dotenv";
config({ path: new URL("../../../.env", import.meta.url).pathname, quiet: true });
config({ quiet: true });

// ESM import hoisting을 피하기 위해 env 로드 후 동적 import
const [{ default: bcrypt }, { db, pgClient }, { operators }] = await Promise.all([
  import("bcryptjs"),
  import("./client"),
  import("./schema"),
]);

const email = process.env.SEED_OPERATOR_EMAIL ?? "admin@example.com";
const password = process.env.SEED_OPERATOR_PASSWORD ?? "admin1234!";

try {
  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .insert(operators)
    .values({ email, passwordHash, name: "운영자" })
    .onConflictDoUpdate({ target: operators.email, set: { passwordHash } });
  console.log(`✔ seeded operator ${email} (password: ${password})`);
} finally {
  await pgClient.end();
}
