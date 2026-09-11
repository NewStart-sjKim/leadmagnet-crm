# ADR-0005. 기술 스택 — 모노레포, Next.js × 2, Drizzle, Vercel 2 프로젝트

- 상태: 채택

## 맥락

3일 안에 관리자 UI + API + 공개 폼 서버 + DB + 테스트 + 문서를 완성해야 한다. ADR-0001 에 따라 배포 단위는 두 개(admin, forms)여야 하고, 둘은 같은 DB 스키마를 공유한다. 작성자는 프론트엔드 개발자로, 컨텍스트 전환이 적은 도구가 유리하다.

## 결정

```
leadmagnet-crm/
├─ apps/admin      Next.js 15 (App Router) — 관리자 콘솔 + 관리자 API      :3000
├─ apps/forms      Next.js 15 (App Router) — 공개 폼 서빙 + 제출 API       :3001
├─ packages/db     Drizzle ORM 스키마 · SQL 마이그레이션 · 시드 · 테스트 헬퍼
├─ packages/shared zod 스키마 · 채널 상수 · HTML 검사 유틸 (두 앱 공용 타입)
├─ docs/           OpenAPI, ADR
└─ e2e/            Playwright (두 서버를 함께 띄워 실제 origin 분리 상태로 검증)
```

- **pnpm workspace + Turborepo** — 두 앱이 `packages/db`, `packages/shared` 를 소스 그대로(`transpilePackages`) 공유한다. 빌드 산출물 없이 타입이 앱까지 흐른다.
- **Next.js 를 두 앱 모두에** — 관리자는 서버 컴포넌트로 데이터를 직접 읽고(빠름), 변경은 REST API 를 호출한다(API 문서화 요구사항과 테스트 대상이 하나로 모임). forms 는 Route Handler 로 HTML 을 직접 응답한다(리액트 렌더링 없음).
- **Drizzle ORM + postgres.js** — 스키마가 TypeScript 로 정의되고 `drizzle-kit generate` 가 **평문 SQL 마이그레이션**을 만든다(`packages/db/drizzle/0000_init.sql`). 제출물 "DB 스키마와 마이그레이션" 을 사람이 읽을 수 있는 형태로 충족한다. 순수 JS 라 네이티브 바이너리가 없다.
- **인증은 직접 구현** (bcrypt + DB 세션 + 쿠키). 라이브러리 뒤에 숨기면 ADR-0001 의 쿠키 속성 결정이 코드에서 드러나지 않는다. 운영자 계정은 시드로만 만든다(회원가입 없음, §4).
- **테스트**: Vitest 로 Route Handler 를 직접 호출(Next 서버 없이 빠름, 테스트 DB `leadmagnet_test`), Playwright 로 두 서버를 띄운 E2E.
- **배포: Vercel 프로젝트 2개** — 같은 저장소, Root Directory 를 `apps/admin` / `apps/forms` 로 지정. 각 앱의 `vercel.json` 에 `ignoreCommand: npx turbo-ignore` 를 두어 **해당 앱 또는 그 의존 패키지가 바뀐 커밋만** 빌드된다. 마이그레이션은 admin 빌드에서만 실행(`migrate:deploy`)해 경쟁을 피한다. Postgres 는 Neon 하나(풀러 연결, Vercel 함수와 같은 미국 동부 리전)를 두 프로젝트가 공유한다. 두 프로젝트가 서로 다른 `*.vercel.app` 도메인을 받으므로 origin 분리(ADR-0001)가 인프라 수준에서 성립한다(`vercel.app` 은 Public Suffix List 에 있어 `SameSite=Strict` 도 cross-site 로 동작).

## 대안과 기각 이유

- **Prisma** — 최초 선택이었으나 개발 환경의 네트워크 정책이 Prisma 엔진 바이너리 배포 서버(`binaries.prisma.sh`)를 차단해 사용할 수 없었다. Drizzle 은 동등한 타입 안전성을 제공하면서 바이너리 의존이 없고, 마이그레이션이 SQL 로 남는 점이 제출물 관점에서 오히려 낫다.
- **단일 Next.js 앱 + 호스트 기반 라우팅** — 배포는 하나지만 같은 코드베이스라 "forms 번들에 admin 코드가 없다" 를 구조적으로 보장하기 어렵고, 한 커밋이 항상 두 도메인을 함께 재배포한다.
- **NestJS 백엔드 + Next.js 프론트** — origin 분리는 자연스럽지만 3일 안에 레포 두 개와 타입 공유 파이프라인을 따로 관리해야 한다.
- **SQLite** — 관계형 DB 요건은 만족하지만 JSONB·enum·서버리스 배포 호환이 떨어진다.

## 결과

- 로컬 개발은 `pnpm dev` 하나로 두 앱이 뜬다. 포트가 다르므로 origin 이 분리된다(단, 로컬의 `localhost:3000/3001` 은 same-site 라 `SameSite=Strict` 만으로는 쿠키가 막히지 않는다 → 미들웨어의 Origin/Sec-Fetch-Site 검사가 로컬에서도 CSRF 를 막는다).
- 두 앱의 `next.config.ts` 는 거의 동일하다. 공용 설정 패키지로 뽑을 수 있지만 두 개뿐이라 중복을 허용했다.
- **데모 배포는 Git 연동이 아니라 Vercel CLI 수동 배포다.** Vercel Hobby 플랜은 커밋 작성자가 팀 소유자와 일치해야 배포를 허용하는데, AI 도구가 붙인 `Co-Authored-By` 트레일러를 외부 협업자로 판정해 Git 연동 배포가 막혔다(Pro 결제 유도). 그래서 `git archive` 로 커밋 내용을 그대로 풀어 `vercel deploy --prod` 로 올린다. 위의 `ignoreCommand`(바뀐 앱만 빌드)는 Git 연동으로 전환하면 그대로 동작하며, 그 외 설정(Root Directory, 환경변수, 마이그레이션 시점)은 두 방식이 같다. 세션 서명 비밀키는 없으므로(ADR-0001, 토큰 해시 저장) 필요한 환경변수는 `DATABASE_URL` · `ADMIN_ORIGIN` · `FORMS_ORIGIN` 뿐이다.
