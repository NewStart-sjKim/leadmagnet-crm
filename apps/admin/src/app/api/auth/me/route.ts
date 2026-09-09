import { handler, json, requireOperator } from "@/lib/api";

/** GET /api/auth/me — 현재 로그인한 운영자 */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  return json({ operator: op });
});
