import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

/** docs/openapi.yaml 을 단일 원본으로 서빙한다 (Vercel 번들 포함: next.config outputFileTracingIncludes) */
export async function GET() {
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "openapi.yaml"), // 모노레포 루트 기준
    path.join(process.cwd(), "docs", "openapi.yaml"),
  ];
  for (const p of candidates) {
    try {
      const yaml = await readFile(p, "utf8");
      return new NextResponse(yaml, { headers: { "content-type": "application/yaml; charset=utf-8" } });
    } catch {
      /* try next */
    }
  }
  return NextResponse.json({ error: "openapi.yaml not found" }, { status: 404 });
}
