import { db, htmlTemplates, forms, eq, and, count } from "@leadmagnet/db";
import { ApiError, handler, json, requireOperator, type RouteCtx } from "@/lib/api";

/** GET /api/admin/templates/:id — 템플릿 상세(원문 포함) */
export const GET = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;
  const [row] = await db
    .select()
    .from(htmlTemplates)
    .where(and(eq(htmlTemplates.id, id), eq(htmlTemplates.operatorId, op.id)))
    .limit(1);
  if (!row) throw new ApiError(404, "템플릿을 찾을 수 없습니다");
  return json({ template: row });
});

/** DELETE /api/admin/templates/:id — 폼에서 사용 중이면 409 */
export const DELETE = handler(async (req, { params }: RouteCtx<{ id: string }>) => {
  const op = await requireOperator(req);
  const { id } = await params;

  // 소유권을 먼저 확인한다. 사용 여부를 먼저 보면 다른 운영자의 템플릿 id 에도 409 가 나가
  // 존재 여부가 드러난다 (다른 운영자 리소스는 항상 404, ADR-0002).
  const [owned] = await db
    .select({ id: htmlTemplates.id })
    .from(htmlTemplates)
    .where(and(eq(htmlTemplates.id, id), eq(htmlTemplates.operatorId, op.id)))
    .limit(1);
  if (!owned) throw new ApiError(404, "템플릿을 찾을 수 없습니다");

  const [used] = await db.select({ n: count() }).from(forms).where(eq(forms.templateId, id));
  if ((used?.n ?? 0) > 0) throw new ApiError(409, "이 템플릿으로 만든 폼이 있어 삭제할 수 없습니다");

  await db.delete(htmlTemplates).where(eq(htmlTemplates.id, id));
  return json({ ok: true });
});
