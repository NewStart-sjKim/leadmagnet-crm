import { db, forms, campaigns, distributionLinks, eq, and } from "@leadmagnet/db";
import { env } from "./env";

export const VISITOR_COOKIE = "lm_vid";
export const VISITOR_TTL_SEC = 60 * 60 * 24 * 365;

export type ServableForm = {
  id: string;
  slug: string;
  title: string;
  htmlSnapshot: string;
  successMessage: string;
  isActive: boolean;
  campaignStatus: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export async function loadForm(slug: string): Promise<ServableForm | null> {
  const [row] = await db
    .select({
      id: forms.id,
      slug: forms.slug,
      title: forms.title,
      htmlSnapshot: forms.htmlSnapshot,
      successMessage: forms.successMessage,
      isActive: forms.isActive,
      campaignStatus: campaigns.status,
    })
    .from(forms)
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(eq(forms.slug, slug))
    .limit(1);
  return row ?? null;
}

/** 폼이 공개 상태인지: 폼 활성 + 캠페인이 PAUSED/ARCHIVED 가 아님 */
export function isOpen(f: ServableForm) {
  return f.isActive && f.campaignStatus !== "PAUSED" && f.campaignStatus !== "ARCHIVED";
}

export async function resolveLink(formId: string, code: string | null) {
  if (!code) return null;
  const [row] = await db
    .select({ id: distributionLinks.id, channel: distributionLinks.channel })
    .from(distributionLinks)
    .where(and(eq(distributionLinks.formId, formId), eq(distributionLinks.code, code)))
    .limit(1);
  return row ?? null;
}

/**
 * 업로드된 HTML(신뢰 불가)을 그대로 내보내되, 브릿지 스크립트를 주입한다.
 * - </body> 앞에 삽입, 없으면 문서 끝에 추가
 * - 설정값은 JSON.stringify 후 </script> 이스케이프 (스크립트 탈출 방지)
 */
export function injectBridge(html: string, cfg: { slug: string; code: string | null; preview: boolean; successMessage: string }) {
  const json = JSON.stringify(cfg).replace(/</g, "\\u003c");
  const tag = `\n<script>window.__LM_FORM__=${json};</script>\n<script src="/lm-bridge.js" defer></script>\n`;
  const i = html.search(/<\/body\s*>/i);
  return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}

/**
 * 공개 폼 응답의 보안 헤더 (ADR-0001)
 * - connect-src 'self': 업로드된 HTML 안의 스크립트는 이 origin 으로만 요청 가능 → 관리자 API 호출 불가
 * - frame-ancestors: 관리자 콘솔의 미리보기 iframe 만 허용
 * - form-action 'self': 네이티브 폼 전송도 외부로 못 나감
 */
export function securityHeaders(): Record<string, string> {
  return {
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": [
      "default-src 'self' https: data: blob: 'unsafe-inline'",
      "script-src 'self' https: 'unsafe-inline'",
      "connect-src 'self'",
      "form-action 'self'",
      `frame-ancestors 'self' ${env.adminOrigin}`,
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
  };
}

export function closedPage(title: string) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — 마감</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,system-ui,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:#fafafa;color:#171717}.box{text-align:center;padding:40px;max-width:420px}h1{font-size:20px;margin:0 0 8px}p{color:#737373;margin:0;font-size:14px}</style></head>
<body><div class="box"><h1>신청이 마감되었습니다</h1><p>${escapeHtml(title)} 폼은 현재 접수를 받지 않습니다.</p></div></body></html>`;
}

export function notFoundPage() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>폼을 찾을 수 없습니다</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,system-ui,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:#fafafa;color:#171717}.box{text-align:center;padding:40px}h1{font-size:20px;margin:0 0 8px}p{color:#737373;margin:0;font-size:14px}</style></head>
<body><div class="box"><h1>폼을 찾을 수 없습니다</h1><p>링크가 잘못되었거나 삭제된 폼입니다.</p></div></body></html>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
