import { NextResponse, type NextRequest } from "next/server";
import { injectBridge, loadForm, notFoundPage, securityHeaders } from "@/lib/serve";

export const dynamic = "force-dynamic";

/**
 * GET /p/:slug — 관리자 미리보기 전용
 * 방문을 기록하지 않고, 브릿지가 preview 모드로 동작해 제출도 막는다.
 * 마감된 폼도 미리보기는 가능하다.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) return new NextResponse(notFoundPage(), { status: 404, headers: securityHeaders() });
  const html = injectBridge(form.htmlSnapshot, { slug: form.slug, code: null, preview: true, successMessage: form.successMessage });
  return new NextResponse(html, { status: 200, headers: { ...securityHeaders(), "x-robots-tag": "noindex" } });
}
