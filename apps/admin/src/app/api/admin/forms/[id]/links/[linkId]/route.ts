import { db, distributionLinks, visits, leads, eq, and, count } from "@leadmagnet/db";
import { ApiError, handler, json, requireOperator, type RouteCtx } from "@/lib/api";
import { findOwnedForm } from "@/lib/forms";

/**
 * DELETE /api/admin/forms/:id/links/:linkId — 배포 링크 삭제
 *
 * 방문·신청이 기록된 링크는 지우지 않는다(409). `visits.link_id` / `leads.link_id` 가
 * `on delete set null` 이라 삭제하면 그 트래픽이 조용히 DIRECT 로 재분류되어 성과가 왜곡된다.
 * 잘못 만든 빈 링크만 정리할 수 있게 한다.
 */
export const DELETE = handler(async (req, { params }: RouteCtx<{ id: string; linkId: string }>) => {
  const op = await requireOperator(req);
  const { id, linkId } = await params;
  await findOwnedForm(id, op.id); // 소유권 검증 (다른 운영자면 404)

  const [link] = await db
    .select({ id: distributionLinks.id })
    .from(distributionLinks)
    .where(and(eq(distributionLinks.id, linkId), eq(distributionLinks.formId, id)))
    .limit(1);
  if (!link) throw new ApiError(404, "배포 링크를 찾을 수 없습니다");

  const [v] = await db.select({ n: count() }).from(visits).where(eq(visits.linkId, linkId));
  const [l] = await db.select({ n: count() }).from(leads).where(eq(leads.linkId, linkId));
  const visitN = v?.n ?? 0;
  const leadN = l?.n ?? 0;
  if (visitN + leadN > 0) {
    throw new ApiError(409, `방문 ${visitN}건 · 신청 ${leadN}건이 기록된 링크입니다. 삭제하면 성과가 직접 유입으로 바뀌어 지울 수 없습니다`);
  }

  await db.delete(distributionLinks).where(eq(distributionLinks.id, linkId));
  return json({ ok: true });
});
