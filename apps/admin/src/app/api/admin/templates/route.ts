import { db, htmlTemplates, eq, desc } from "@leadmagnet/db";
import { inspectHtml } from "@leadmagnet/shared";
import { ApiError, handler, json, requireOperator } from "@/lib/api";

const MAX_BYTES = 512 * 1024;

/** GET /api/admin/templates — 등록한 HTML 템플릿 목록(원문 제외) */
export const GET = handler(async (req) => {
  const op = await requireOperator(req);
  const rows = await db
    .select({
      id: htmlTemplates.id,
      name: htmlTemplates.name,
      fileName: htmlTemplates.fileName,
      sizeBytes: htmlTemplates.sizeBytes,
      fieldNames: htmlTemplates.fieldNames,
      createdAt: htmlTemplates.createdAt,
    })
    .from(htmlTemplates)
    .where(eq(htmlTemplates.operatorId, op.id))
    .orderBy(desc(htmlTemplates.createdAt));
  return json({ templates: rows });
});

/**
 * POST /api/admin/templates — 단일 .html 파일 등록 (multipart/form-data: file, name?)
 * 검증: 확장자 .html/.htm, 512KB 이하, <form> 요소 존재.
 * 정화(sanitize)는 하지 않는다 — 격리는 origin 분리 + CSP 로 해결 (ADR-0001).
 */
export const POST = handler(async (req) => {
  const op = await requireOperator(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "multipart/form-data 요청이어야 합니다");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "file 필드에 .html 파일을 첨부해 주세요");
  if (!/\.html?$/i.test(file.name)) throw new ApiError(400, ".html 파일만 등록할 수 있습니다");
  if (file.size === 0) throw new ApiError(400, "빈 파일입니다");
  if (file.size > MAX_BYTES) throw new ApiError(400, `파일은 ${MAX_BYTES / 1024}KB 이하여야 합니다`);

  const html = await file.text();
  const inspection = inspectHtml(html);
  if (!inspection.hasForm) throw new ApiError(400, "HTML 안에 <form> 요소가 있어야 신청 폼으로 사용할 수 있습니다");

  const rawName = form.get("name");
  const name = (typeof rawName === "string" && rawName.trim()) || file.name.replace(/\.html?$/i, "");

  const [row] = await db
    .insert(htmlTemplates)
    .values({
      operatorId: op.id,
      name: name.slice(0, 100),
      fileName: file.name,
      html,
      sizeBytes: file.size,
      fieldNames: inspection.fieldNames,
    })
    .returning({
      id: htmlTemplates.id,
      name: htmlTemplates.name,
      fileName: htmlTemplates.fileName,
      sizeBytes: htmlTemplates.sizeBytes,
      fieldNames: htmlTemplates.fieldNames,
      createdAt: htmlTemplates.createdAt,
    });

  return json({ template: row, warnings: inspection.hasScript ? ["템플릿에 <script>가 포함되어 있습니다. 공개 폼 origin에서만 실행됩니다."] : [] }, { status: 201 });
});
