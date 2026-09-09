# ADR-0003. 임의의 HTML 폼을 제출 API 에 연결하는 계약 — 브릿지 스크립트 주입

- 상태: 채택
- 구현: `apps/forms/src/lib/serve.ts#injectBridge`, `apps/forms/public/lm-bridge.js`

## 맥락

운영자가 등록하는 HTML 은 AI 가 만든 것이라 `<form action>` 이 비어 있거나 엉뚱한 곳을 가리키고, 필드 이름도 제멋대로다. 그런데 방문자가 "신청" 을 누르면 데이터가 **우리 DB 의 CRM 명단** 에 들어가야 한다. 시스템과 HTML 사이에 최소한의 계약이 필요하며, 이 계약이 운영자에게 요구하는 것이 적을수록 좋다("개발자 도움 없이").

## 결정

**서빙 시점에 서버가 브릿지 스크립트를 주입한다.**

1. `GET /f/{slug}` 가 스냅샷 HTML 의 `</body>` 직전에 두 줄을 끼워 넣는다.
   ```html
   <script>window.__LM_FORM__={"slug":"…","code":"ig_…","preview":false,"successMessage":"…"};</script>
   <script src="/lm-bridge.js" defer></script>
   ```
   설정 JSON 은 `<` 를 `<` 로 이스케이프해 `</script>` 탈출이 불가능하다(테스트 있음).
2. `lm-bridge.js` 는 문서의 **첫 `<form>`** 에 `submit` 리스너를 capture 단계로 건다. 브라우저 네이티브 유효성 검사(`required`, `type=email`)가 통과한 뒤에만 `submit` 이 발생하므로 AI 폼의 검증 UX 를 그대로 살린다.
3. `FormData` 를 `{ name → string | string[] }` 로 평탄화해 `POST /api/public/forms/{slug}/submit` 에 JSON 으로 보낸다. 같은 origin 이므로 CORS 가 필요 없고 CSP `connect-src 'self'` 와도 부합한다.
4. 성공하면 `<form>` 을 완료 메시지로 교체하고 `lm:submitted` 이벤트를 발행한다(운영자 스크립트가 후처리 가능). 실패하면 폼 아래에 오류를 표시하고 재시도 가능 상태로 되돌린다.
5. **운영자에게 요구하는 것은 두 가지뿐**: `<form>` 하나, 그리고 입력 필드의 `name` 속성. 업로드 시 이 둘을 검사해 `<form>` 이 없으면 `400`, `name` 이 하나도 없으면 UI 에 "필드 없음" 을 표시한다.

## 대안과 기각 이유

- **운영자가 `action` URL 을 직접 넣기** — 폼 생성 후에야 slug 가 정해지므로 HTML 을 다시 고쳐 재등록해야 한다. 운영자 부담이 크고 실수 여지가 많다.
- **서버가 `<form action>` 을 정규식으로 치환** — 네이티브 폼 전송은 페이지 이동을 일으켜 완료 화면을 따로 만들어야 하고, AI 폼이 `fetch` 로 자체 제출을 구현한 경우 무시된다. 브릿지는 `submit` 이벤트를 가로채므로 두 경우 모두 동작한다.
- **필드 스키마를 별도로 등록** — 범용 폼 빌더에 가까워지며 과제 범위 밖(§4)이다. JSONB 로 전부 받으면 스키마 없이도 CRM 명단이 만들어진다.
- **iframe + postMessage 브릿지** — 공개 페이지에서는 불필요한 계층이다. 격리는 origin 분리로 이미 확보되어 있다(ADR-0001).

## 결과

- 파일 업로드 필드(`type=file`)는 지원하지 않는다(문자열만 전송). 리드마그넷 신청 폼에 파일이 필요한 경우는 드물다고 판단했다.
- 문서에 `<form>` 이 여러 개면 첫 번째만 연결된다. 업로드 시 안내한다.
- 브릿지가 로드되기 전에 사용자가 제출하면 네이티브 전송이 일어날 수 있으나 `form-action 'self'` CSP 로 외부 유출은 막히고, `defer` 스크립트는 DOM 파싱 직후 실행되어 실질적 창은 매우 짧다.
- 테스트: `apps/forms/tests/public-form.test.ts`(주입 위치·이스케이프·payload), `e2e/02-lead-flow.spec.ts`(실제 브라우저에서 브릿지를 통한 제출).
