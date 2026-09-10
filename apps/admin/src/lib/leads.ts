import { db, leads, forms, campaigns, distributionLinks, eq, and, or, ilike, desc, count } from "@leadmagnet/db";

export type LeadFilter = { campaignId?: string; formId?: string; q?: string };

/** CSV 내보내기 상한 — 서버리스 응답 크기·시간을 지키기 위한 안전장치 */
const EXPORT_MAX = 10_000;

function whereFor(operatorId: string, f: LeadFilter) {
  const q = f.q?.trim();
  // LIKE 와일드카드(% _ \)는 리터럴로 검색되도록 이스케이프
  const pattern = q ? `%${q.replace(/[\%_]/g, (c) => `\${c}`)}%` : undefined;
  return and(
    eq(campaigns.operatorId, operatorId),
    f.campaignId ? eq(forms.campaignId, f.campaignId) : undefined,
    f.formId ? eq(leads.formId, f.formId) : undefined,
    pattern ? or(ilike(leads.name, pattern), ilike(leads.email, pattern), ilike(leads.phone, pattern)) : undefined,
  );
}

function selectLeads(operatorId: string, f: LeadFilter) {
  return db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      payload: leads.payload,
      createdAt: leads.createdAt,
      formId: leads.formId,
      formTitle: forms.title,
      campaignId: forms.campaignId,
      campaignName: campaigns.name,
      channel: distributionLinks.channel,
      linkLabel: distributionLinks.label,
    })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .leftJoin(distributionLinks, eq(distributionLinks.id, leads.linkId))
    .where(whereFor(operatorId, f))
    .orderBy(desc(leads.createdAt));
}

export async function fetchLeads(operatorId: string, opts: LeadFilter & { page: number; pageSize: number }) {
  const rows = await selectLeads(operatorId, opts)
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize);
  const [totalRow] = await db
    .select({ n: count() })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(whereFor(operatorId, opts));
  return { leads: rows, total: totalRow?.n ?? 0, page: opts.page, pageSize: opts.pageSize };
}
export type LeadRow = Awaited<ReturnType<typeof fetchLeads>>["leads"][number];

/** 페이지네이션 없이 필터에 맞는 명단 전체 (CSV 내보내기용) */
export function fetchLeadsForExport(operatorId: string, f: LeadFilter) {
  return selectLeads(operatorId, f).limit(EXPORT_MAX);
}

const CSV_HEAD = ["신청 시각", "캠페인", "폼", "채널", "링크 라벨", "이름", "이메일", "연락처"];

/**
 * CSV 셀 이스케이프.
 * - 콤마·따옴표·줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 이중화
 * - `= + - @` 탭·CR 로 시작하면 앞에 `'` 를 붙여 스프레드시트 수식 인젝션을 막는다 (OWASP CSV Injection)
 */
function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 고정 컬럼 뒤에 응답(payload) 필드를 키 이름순으로 이어 붙인다. 엑셀 한글 호환을 위해 UTF-8 BOM 을 붙인다. */
export function leadsToCsv(rows: LeadRow[]): string {
  const extra = Array.from(new Set(rows.flatMap((r) => Object.keys(r.payload)))).sort();
  const lines = [[...CSV_HEAD, ...extra].map(cell).join(",")];
  for (const r of rows) {
    const p = r.payload as Record<string, unknown>;
    const at = r.createdAt.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD HH:mm:ss
    lines.push(
      [at, r.campaignName, r.formTitle, r.channel ?? "DIRECT", r.linkLabel, r.name, r.email, r.phone, ...extra.map((k) => p[k])]
        .map(cell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
