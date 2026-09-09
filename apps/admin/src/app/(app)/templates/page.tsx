import { db, htmlTemplates, eq, desc } from "@leadmagnet/db";
import { getCurrentOperator } from "@/lib/session";
import { PageHeader, Empty, fmtDate } from "@/components/ui";
import { TemplateUpload } from "@/components/template-upload";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const op = (await getCurrentOperator())!;
  const rows = await db
    .select({ id: htmlTemplates.id, name: htmlTemplates.name, fileName: htmlTemplates.fileName, sizeBytes: htmlTemplates.sizeBytes, fieldNames: htmlTemplates.fieldNames, createdAt: htmlTemplates.createdAt })
    .from(htmlTemplates)
    .where(eq(htmlTemplates.operatorId, op.id))
    .orderBy(desc(htmlTemplates.createdAt));

  return (
    <>
      <PageHeader title="HTML 템플릿" description="AI로 만든 단일 .html 신청 폼 파일을 등록합니다. 파일 안에 <form> 요소와 name 속성이 있는 입력 필드가 있어야 합니다." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <TemplateUpload />
        <div>
          {rows.length === 0 ? (
            <Empty>등록된 템플릿이 없습니다.</Empty>
          ) : (
            <ul className="space-y-3">
              {rows.map((t) => (
                <li key={t.id} className="card flex items-start justify-between gap-4 p-4" data-testid="template-item">
                  <div className="min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">{t.fileName} · {(t.sizeBytes / 1024).toFixed(1)}KB · {fmtDate(t.createdAt)}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.fieldNames.length === 0 ? <span className="text-xs text-neutral-400">필드 없음</span> : t.fieldNames.map((f) => <code key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px]">{f}</code>)}
                    </div>
                  </div>
                  <DeleteButton url={`/api/admin/templates/${t.id}`} confirmText="이 템플릿을 삭제할까요?" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
