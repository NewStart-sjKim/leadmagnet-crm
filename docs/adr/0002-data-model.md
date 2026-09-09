# ADR-0002. 데이터 모델 — 템플릿 스냅샷, 링크 단위 채널 귀속, 리드 payload

- 상태: 채택
- 스키마: `packages/db/src/schema.ts`, 마이그레이션: `packages/db/drizzle/`

## 맥락

요구사항의 흐름은 "HTML 등록 → 캠페인/커스텀 폼 → 채널별 배포 링크 → 방문/신청 → 캠페인별·채널별 성과" 이다. 각 단계가 테이블 하나에 1:1 로 대응되도록 모델링하면 질의가 단순해지고 요구사항 추적이 쉬워진다.

```
operators ─┬─ html_templates ─┐
           └─ campaigns ──── forms ─── distribution_links ─┬─ visits
                                  └───────────────────────┴─ leads
```

## 결정

1. **`forms.html_snapshot` — 템플릿 원문을 폼 생성 시점에 복사**. 운영자가 나중에 템플릿을 교체/삭제해도 이미 SNS 에 뿌린 링크의 폼이 바뀌거나 깨지지 않아야 한다. 저장 공간 중복(수십 KB × 폼 수)은 무시할 수 있는 비용이다. 템플릿 삭제는 폼이 참조 중이면 `409` 로 막는다(`onDelete: restrict`).

2. **채널은 `distribution_links.channel` 에 귀속**. 폼 하나에 채널별 링크가 여러 개 달리고(같은 채널에 여러 개도 가능, `label` 로 구분), `visits`/`leads` 는 `link_id` 를 가진다. 그러면 "채널별 성과" 는 `LEFT JOIN distribution_links GROUP BY channel` 한 줄로 끝난다. 링크 없이 들어온 방문은 `DIRECT` 로 묶는다.

3. **`leads.payload JSONB` + 승격 컬럼 `name/email/phone`**. HTML 은 AI 가 만든 임의 구조이므로 필드 스키마를 미리 알 수 없다 → 모든 필드를 JSONB 로 통째 저장한다. 다만 CRM 명단에서 정렬/검색/중복 확인이 필요한 연락처 3종은 흔한 필드명(영/한 동의어)으로 추출해 컬럼으로 승격한다. 승격 실패(필드명이 예상 밖)해도 payload 에 데이터는 보존된다.

4. **`visits` 는 append-only, `visitor_id` 컬럼 보유**. "방문" 과 "방문자" 를 구분해야 하므로(ADR-0004) 각 방문 행에 방문자 식별자를 둔다. `bigserial` PK 로 대량 적재에 대비한다.

5. **`sessions` 를 DB 테이블로** — JWT 대신 서버 세션. 로그아웃 즉시 무효화가 가능하고, 토큰 해시만 저장한다(ADR-0001).

6. **모든 소유 관계는 `operator_id` 로 추적**하고 관리자 API 는 항상 소유자 조건을 함께 건다. 다른 운영자의 리소스는 존재해도 `404` (존재 여부 비노출).

## 대안과 기각 이유

- 폼이 템플릿을 참조만 하기(스냅샷 없음) — 템플릿 수정이 배포된 폼에 즉시 반영되는 것이 편리해 보이지만, 운영자가 의도치 않게 라이브 폼을 깨뜨릴 수 있고 "배포 시점의 폼이 무엇이었는지" 를 잃는다.
- 채널을 `visits.channel` 컬럼에 직접 기록 — 링크 단위 label(스토리/피드 A/B) 구분이 불가능하고, 링크가 곧 채널을 증명하는 구조가 더 정직하다.
- 리드 필드를 정규화(`lead_fields(lead_id, key, value)`) — 임의 스키마엔 맞지만 조회가 EAV 로 복잡해진다. JSONB 가 Postgres 에서 인덱싱/조회 모두 충분하다.

## 결과

- 캠페인별/채널별 집계는 `apps/admin/src/lib/stats.ts` 의 두 쿼리(visits, leads)를 앱에서 합치는 방식으로 구현. 데이터가 커지면 일 단위 집계 테이블로 옮길 수 있는 구조다.
- 캠페인 삭제는 cascade 로 폼/링크/방문/리드가 함께 지워진다. 실서비스라면 soft delete 가 맞지만 과제 범위에서는 단순함을 택했다(ADR-0006).
