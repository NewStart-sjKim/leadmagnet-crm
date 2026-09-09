/**
 * 업로드된 HTML에 대한 최소 검증/분석.
 * 정화(sanitize)는 하지 않는다 — AI가 만든 폼의 스크립트를 살려야 하므로,
 * 격리는 origin 분리 + iframe sandbox + CSP로 해결한다 (ADR-0001).
 */

export interface HtmlInspection {
  hasForm: boolean;
  fieldNames: string[];
  hasScript: boolean;
}

const NAME_ATTR = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

export function inspectHtml(html: string): HtmlInspection {
  const formMatch = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i);
  const hasForm = Boolean(formMatch);
  const scope = formMatch?.[0] ?? "";

  const names = new Set<string>();
  // 폼 안의 input/select/textarea 태그만 대상으로 name 추출
  for (const tag of scope.match(/<(?:input|select|textarea)\b[^>]*>/gi) ?? []) {
    NAME_ATTR.lastIndex = 0;
    const m = NAME_ATTR.exec(tag);
    const name = m?.[1] ?? m?.[2] ?? m?.[3];
    if (name) names.add(name);
  }

  return {
    hasForm,
    fieldNames: [...names],
    hasScript: /<script\b/i.test(html),
  };
}

/** 리드 컬럼 승격용: 흔한 필드 이름에서 name/email/phone을 뽑는다. */
export function extractContact(fields: Record<string, string | string[]>) {
  const first = (keys: string[]) => {
    for (const k of Object.keys(fields)) {
      if (keys.includes(k.toLowerCase())) {
        const v = fields[k];
        const s = Array.isArray(v) ? v[0] : v;
        if (s && s.trim()) return s.trim();
      }
    }
    return null;
  };
  return {
    name: first(["name", "fullname", "full_name", "username", "이름", "성함"]),
    email: first(["email", "e-mail", "mail", "이메일"]),
    phone: first(["phone", "tel", "mobile", "phone_number", "phonenumber", "연락처", "전화번호", "휴대폰"]),
  };
}
