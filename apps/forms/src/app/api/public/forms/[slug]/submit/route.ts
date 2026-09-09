import { NextResponse, type NextRequest } from "next/server";
import { db, leads } from "@leadmagnet/db";
import { publicSubmissionSchema, extractContact } from "@leadmagnet/shared";
import { VISITOR_COOKIE, isOpen, loadForm, resolveLink } from "@/lib/serve";

export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

/**
 * POST /api/public/forms/:slug/submit — 브릿지 스크립트가 호출하는 제출 엔드포인트
 * body: { code?: string, fields: Record<string, string | string[]> }
 * 응답: 201 { ok, leadId, message } | 400 | 404 | 410 | 413
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return NextResponse.json({ error: "요청이 너무 큽니다" }, { status: 413 });

  const form = await loadForm(slug);
  if (!form) return NextResponse.json({ error: "폼을 찾을 수 없습니다" }, { status: 404 });
  if (!isOpen(form)) return NextResponse.json({ error: "신청이 마감되었습니다" }, { status: 410 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다" }, { status: 400 });
  }
  const parsed = publicSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() }, { status: 400 });
  }

  const link = await resolveLink(form.id, parsed.data.code ?? null);
  const contact = extractContact(parsed.data.fields);
  const visitorId = req.cookies.get(VISITOR_COOKIE)?.value ?? null;

  const [lead] = await db
    .insert(leads)
    .values({
      formId: form.id,
      linkId: link?.id ?? null,
      visitorId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      payload: parsed.data.fields,
    })
    .returning({ id: leads.id });

  return NextResponse.json({ ok: true, leadId: lead!.id, message: form.successMessage }, { status: 201 });
}
