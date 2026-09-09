# ADR-0001. 등록된 HTML 을 관리자 인증/API 로부터 격리하는 방법

- 상태: 채택
- 관련 요구사항: 비기능 §3 "등록한 HTML 이 관리자 인증 정보나 관리자 API 에 접근하지 못하게 해야 합니다"

## 맥락

운영자는 AI 로 생성한 `.html` 파일을 **그대로** 등록한다. 이 파일에는 임의의 `<script>` 가 들어 있을 수 있고, 운영자 본인이 악의가 없어도 AI 출력에 섞인 외부 스크립트(CDN, 트래킹 픽셀)나 복붙된 코드가 무엇을 할지 보증할 수 없다. 따라서 등록된 HTML 은 **신뢰할 수 없는 코드(untrusted)** 로 취급해야 한다.

이 HTML 이 관리자 페이지와 같은 origin 에서 렌더링되면 `document.cookie` 로 세션을 읽거나 `fetch('/api/admin/leads')` 로 CRM 명단을 통째로 가져갈 수 있다. 브라우저 보안 모델에서 **origin** 이 격리의 기본 단위이므로 여기서 해법을 찾아야 한다.

## 결정

네 겹의 방어를 조합한다. 어느 한 겹이 실패해도 나머지가 막는다.

1. **origin 분리 (구조적 격리)** — 관리자(`apps/admin`, `ADMIN_ORIGIN`)와 공개 폼(`apps/forms`, `FORMS_ORIGIN`)을 **별도 앱, 별도 origin** 으로 배포한다. 공개 폼 origin 에는 관리자 API 도, 관리자 세션도 존재하지 않는다. 등록된 HTML 은 오직 forms origin 에서만 렌더링된다. Same-Origin Policy 가 공짜로 격리를 해준다.

2. **세션 쿠키 속성** — 관리자 세션 쿠키 `lm_admin_session` 은 `HttpOnly`(JS 접근 불가) + `SameSite=Strict`(다른 사이트에서 시작된 요청에 미전송) + `Secure`(프로덕션) 으로 발급한다. 쿠키에는 무작위 토큰만 담고 DB 에는 SHA-256 해시를 저장해 DB 유출 시에도 세션을 재사용할 수 없게 한다.

3. **CSP (능동적 차단)** — 공개 폼 응답에 `Content-Security-Policy` 를 붙인다. 핵심은 `connect-src 'self'` 와 `form-action 'self'` 로, 등록된 HTML 안의 스크립트가 **forms origin 밖으로 fetch/XHR/폼 전송을 할 수 없다**. 관리자 API URL 을 알아도 네트워크 요청 자체가 브라우저에서 차단된다(E2E 테스트 `03-isolation` 에서 `TypeError` 로 확인). `frame-ancestors 'self' {ADMIN_ORIGIN}` 으로 관리자 콘솔의 미리보기 iframe 만 이 페이지를 임베드할 수 있다. 반면 AI 생성 HTML 이 흔히 쓰는 인라인 스타일/스크립트, CDN(Tailwind Play 등)은 허용해야 하므로 `script-src 'self' https: 'unsafe-inline'` 으로 둔다.

4. **관리자 콘솔 미리보기는 sandbox iframe** — `<iframe sandbox="allow-forms allow-scripts">` 로 `allow-same-origin` 을 **주지 않는다**. 임베드된 문서는 opaque origin 에서 실행되어 부모 문서(관리자)와 어떤 상호작용도 할 수 없다. 미리보기는 `/p/{slug}` 라는 별도 경로로, 방문을 기록하지 않고 브릿지가 제출을 막는다.

추가로 관리자 API 는 미들웨어에서 `Sec-Fetch-Site: cross-site` 이거나 `Origin` 이 관리자 origin 과 다르면 `403` 을 반환한다 (CSRF 방어). 쿠키가 우연히 전송되는 환경(예: 로컬 개발의 `localhost:3000` / `localhost:3001` 은 same-site)에서도 다른 origin 에서 시작된 요청을 거부한다.

## 대안과 기각 이유

- **HTML 정화(DOMPurify 등으로 `<script>` 제거)** — AI 가 만든 폼의 인터랙션(유효성 검사, 단계 전환, 애니메이션)을 죽인다. "운영자가 개발자 도움 없이 AI 로 폼을 만든다" 는 과제의 전제와 충돌한다. 또한 정화 우회 기법은 끊임없이 발견되므로 정화 *단독* 으로는 신뢰할 수 없다. 격리를 origin 에 맡기면 정화는 필요하지 않다.
- **같은 앱에서 경로만 분리 (`/f/*` vs `/admin/*`)** — 같은 origin 이므로 격리가 성립하지 않는다. CSP 만으로 막으려면 CSP 설정 하나가 유일한 방어선이 되어 취약하다.
- **HTML 을 `srcdoc` 으로만 렌더링** — 공개 방문자에게 직접 URL 을 줄 수 없고, SNS 링크 미리보기(OG 태그)도 동작하지 않는다.

## 결과

- 두 개의 배포 단위가 생긴다 (ADR-0005). 로컬 개발도 포트 두 개를 띄운다.
- 등록된 HTML 안의 스크립트는 외부 API(예: 운영자가 직접 넣은 GA 이벤트 전송)를 호출할 수 없다. 이는 의도된 제약이며 README/ADR 에 명시한다. 필요해지면 운영자별 허용 도메인을 CSP 에 추가하는 확장이 가능하다.
- 테스트: `apps/forms/tests/public-form.test.ts` (헤더/쿠키 검증), `e2e/03-isolation.spec.ts` (악성 템플릿이 실제 브라우저에서 관리자 API/쿠키에 접근 못함, sandbox 속성, CSRF 403).
