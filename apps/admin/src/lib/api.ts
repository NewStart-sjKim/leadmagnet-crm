import { NextResponse, type NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import { getOperatorFromRequest, type CurrentOperator } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, details: e.details ?? undefined }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

/** 인증 필수. 실패 시 401. */
export async function requireOperator(req: NextRequest): Promise<CurrentOperator> {
  const op = await getOperatorFromRequest(req);
  if (!op) throw new ApiError(401, "Unauthorized");
  return op;
}

export async function parseJson<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
  return parsed.data;
}

/** try/catch 보일러플레이트 제거용 래퍼 */
export function handler<Ctx>(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export type RouteCtx<P extends Record<string, string>> = { params: Promise<P> };
