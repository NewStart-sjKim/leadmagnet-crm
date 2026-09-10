import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// 런타임에 FORMS_ORIGIN 을 반영해야 하므로 요청마다 읽는다 (파일은 작고, 환경변수 변경 시 재빌드가 필요 없다)
export const dynamic = "force-dynamic";

/** 로컬 기본값으로 적힌 forms 서버 주소. 서빙 시 실제 FORMS_ORIGIN 으로 바꾼다 */
const LOCAL_FORMS_ORIGIN = "http://localhost:3001";

/**
 * docs/openapi.yaml 을 단일 원본으로 서빙한다 (Vercel 번들 포함: next.config outputFileTracingIncludes).
 * admin 서버는 상대 경로 `/` 라 어느 도메인에서든 맞지만, forms 는 다른 origin 이므로 환경변수로 치환한다.
 */
export async function GET() {
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "openapi.yaml"), // 모노레포 루트 기준
    path.join(process.cwd(), "docs", "openapi.yaml"),
  ];
  for (const p of candidates) {
    try {
      const yaml = (await readFile(p, "utf8")).replaceAll(LOCAL_FORMS_ORIGIN, env.formsOrigin);
      return new NextResponse(yaml, { headers: { "content-type": "application/yaml; charset=utf-8" } });
    } catch {
      /* try next */
    }
  }
  return NextResponse.json({ error: "openapi.yaml not found" }, { status: 404 });
}
