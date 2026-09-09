# 리드마그넷 CRM 운영 시스템

운영자가 AI로 만든 HTML 신청 폼을 등록하고, 캠페인·커스텀 폼을 만들어 채널별 링크로 배포한 뒤 방문·신청·전환 데이터를 확인하는 시스템입니다.

- 관리자 콘솔 · 관리자 API: `apps/admin` (기본 `http://localhost:3000`)
- 공개 신청 폼 · 제출 API: `apps/forms` (기본 `http://localhost:3001`)
- 설계 결정: [`docs/adr/`](docs/adr/README.md) · API 문서: [`docs/openapi.yaml`](docs/openapi.yaml) (실행 후 `http://localhost:3000/api-docs`)

## 실행 방법

### 요구 사항

- Node.js 20 이상, pnpm 10 (`corepack enable` 또는 `npm i -g pnpm`)
- PostgreSQL 14 이상 (로컬 설치 또는 Docker)

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수

```bash
cp .env.example .env
```

`.env` 의 `DATABASE_URL` 을 사용 중인 PostgreSQL 에 맞게 수정합니다. 나머지 값은 로컬 개발 기본값으로 동작합니다.

Docker 로 PostgreSQL 을 띄우는 경우:

```bash
docker run -d --name leadmagnet-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker exec leadmagnet-pg psql -U postgres -c 'CREATE DATABASE leadmagnet;'
docker exec leadmagnet-pg psql -U postgres -c 'CREATE DATABASE leadmagnet_test;'   # 테스트용
```

### 3. 데이터베이스 마이그레이션 · 시드

```bash
pnpm db:migrate   # packages/db/drizzle/*.sql 적용
pnpm db:seed      # 운영자 계정 생성 (기본 admin@example.com / admin1234!)
```

시드 계정은 `.env` 의 `SEED_OPERATOR_EMAIL`, `SEED_OPERATOR_PASSWORD` 로 바꿀 수 있습니다.

### 4. 개발 서버

```bash
pnpm dev
```

- 관리자 콘솔: <http://localhost:3000> → 시드 계정으로 로그인
- 공개 폼 서버: <http://localhost:3001> (폼을 만들면 관리자 콘솔에 링크가 표시됩니다)
- API 문서(Swagger UI): <http://localhost:3000/api-docs>

예시 HTML 폼은 [`examples/sample-ebook-form.html`](examples/sample-ebook-form.html) 입니다. **HTML 템플릿** 메뉴에서 등록 → **캠페인 · 폼** 에서 캠페인과 폼 생성 → 채널 버튼으로 배포 링크 생성 → 링크를 브라우저에서 열어 신청 → **대시보드** 에서 확인.

### 프로덕션 빌드

```bash
pnpm build
pnpm --filter @leadmagnet/admin start   # :3000
pnpm --filter @leadmagnet/forms start   # :3001
```

두 앱은 **서로 다른 origin** 에서 서빙되어야 합니다. `ADMIN_ORIGIN`, `FORMS_ORIGIN` 을 실제 도메인으로 설정하세요. Vercel 배포 시 각 앱 디렉터리를 Root Directory 로 하는 프로젝트 2개를 만들고 같은 `DATABASE_URL` 을 주입합니다 (`apps/*/vercel.json` 참고).

## 테스트 방법

테스트는 별도 데이터베이스를 사용합니다. 기본값은 `postgresql://postgres:postgres@localhost:5432/leadmagnet_test` 이며 `TEST_DATABASE_URL` 로 바꿀 수 있습니다. 마이그레이션은 테스트가 시작될 때 자동으로 적용됩니다.

```bash
# 단위 + API 통합 테스트 (Vitest) — Route Handler 를 직접 호출
pnpm test:unit

# E2E (Playwright) — admin(:3100) · forms(:3101) 두 서버를 자동으로 띄워 실행
pnpm exec playwright install chromium   # 최초 1회
pnpm test:e2e

# 전부
pnpm test
```

개별 패키지만 실행하려면:

```bash
pnpm --filter @leadmagnet/admin test
pnpm --filter @leadmagnet/forms test
pnpm --filter @leadmagnet/shared test
```

E2E 는 `e2e/` 에 있으며 성공 흐름(폼 생성 → 배포 → 신청 → 대시보드 전환 확인)과 실패 흐름(잘못된 로그인, 미인증 리다이렉트, 마감된 폼 410), 그리고 등록된 HTML 이 관리자 API·세션 쿠키에 접근할 수 없음을 실제 브라우저에서 검증합니다.

타입 검사:

```bash
pnpm typecheck
```
