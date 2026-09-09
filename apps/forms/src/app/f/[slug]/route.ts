import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db, visits } from "@leadmagnet/db";
import { VISITOR_COOKIE, VISITOR_TTL_SEC, closedPage, injectBridge, isOpen, loadForm, notFoundPage, resolveLink, securityHeaders } from "@/lib/serve";

export const dynamic = "force-dynamic";

/**
 * GET /f/:slug?c=:code — 공개 신청 폼
 * 1) 폼 조회 (없으면 404, 마감이면 410)
 * 2) visitor 쿠키 확인/발급
 * 3) 방문 1건 기록 (링크 코드로 채널 귀속)
 * 4) HTML 스냅샷 + 브릿지 주입 + 보안 헤더로 응답
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) return new NextResponse(notFoundPage(), { status: 404, headers: securityHeaders() });
  if (!isOpen(form)) return new NextResponse(closedPage(form.title), { status: 410, headers: securityHeaders() });

  const code = req.nextUrl.searchParams.get("c");
  const link = await resolveLink(form.id, code);

  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const isNewVisitor = !visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId);
  if (isNewVisitor) visitorId = randomUUID();

  await db.insert(visits).values({
    formId: form.id,
    linkId: link?.id ?? null,
    visitorId: visitorId!,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    referer: req.headers.get("referer")?.slice(0, 1000) ?? null,
  });

  const html = injectBridge(form.htmlSnapshot, {
    slug: form.slug,
    code: link ? code : null,
    preview: false,
    successMessage: form.successMessage,
  });

  const res = new NextResponse(html, { status: 200, headers: securityHeaders() });
  res.cookies.set(VISITOR_COOKIE, visitorId!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_TTL_SEC,
  });
  return res;
}
