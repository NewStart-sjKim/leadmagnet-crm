// 리드마그넷 CRM 운영 시스템 — 데이터 모델 (Drizzle ORM / PostgreSQL)
//
// 흐름: operators ─ html_templates ─ campaigns ─ forms ─ distribution_links ─ visits / leads
// 설계 근거는 docs/adr/0002-data-model.md 참고.

import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ────────────────────────────────────────────────────────────────────────────
// 운영자 & 세션
// ────────────────────────────────────────────────────────────────────────────

/** 운영자(관리자). 인증된 운영자만 관리자 기능과 신청자 데이터에 접근한다. */
export const operators = pgTable("operators", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

/** 서버 사이드 세션. 쿠키에는 세션 id만 담긴다(HttpOnly, SameSite=Strict, admin origin 한정). */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    operatorId: text("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_operator_idx").on(t.operatorId)],
);

// ────────────────────────────────────────────────────────────────────────────
// HTML 템플릿 / 캠페인 / 폼
// ────────────────────────────────────────────────────────────────────────────

/**
 * 운영자가 AI로 만들어 등록한 단일 .html 파일 원문.
 * 신뢰할 수 없는 콘텐츠로 취급한다 — 공개 폼 origin에서만 렌더링된다 (ADR-0001).
 */
export const htmlTemplates = pgTable(
  "html_templates",
  {
    id: id(),
    operatorId: text("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
    html: text("html").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** 업로드 시 <form> 안의 name 속성을 추출해 둔 목록(참고용) */
    fieldNames: text("field_names").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [index("html_templates_operator_idx").on(t.operatorId)],
);

export const campaignStatus = pgEnum("campaign_status", ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

/** 캠페인 = 하나의 리드마그넷 배포 단위. 성과는 캠페인 단위로 집계된다. */
export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    operatorId: text("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: campaignStatus("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("campaigns_operator_idx").on(t.operatorId)],
);

/**
 * 커스텀 신청 폼 = 캠페인 + 템플릿 스냅샷 + 설정.
 * 템플릿 원문을 복사(snapshot)해 두어, 이후 템플릿이 바뀌어도 배포된 폼은 영향받지 않는다.
 */
export const forms = pgTable(
  "forms",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => htmlTemplates.id, { onDelete: "restrict" }),
    /** 공개 URL: {FORMS_ORIGIN}/f/{slug} */
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    htmlSnapshot: text("html_snapshot").notNull(),
    successMessage: text("success_message").notNull().default("신청이 완료되었습니다. 감사합니다!"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("forms_campaign_idx").on(t.campaignId)],
);

// ────────────────────────────────────────────────────────────────────────────
// 배포 링크 / 방문 / 리드
// ────────────────────────────────────────────────────────────────────────────

export const channel = pgEnum("channel", ["INSTAGRAM", "X", "YOUTUBE", "THREADS"]);

/**
 * 채널별 배포 링크. 공개 URL: {FORMS_ORIGIN}/f/{form.slug}?c={code}
 * 채널을 링크에 귀속시킴으로써 채널별 성과는 단순 group by로 계산된다.
 */
export const distributionLinks = pgTable(
  "distribution_links",
  {
    id: id(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    channel: channel("channel").notNull(),
    code: text("code").notNull().unique(),
    label: text("label"),
    createdAt: createdAt(),
  },
  (t) => [index("distribution_links_form_idx").on(t.formId)],
);

/**
 * 방문 1건 = 공개 폼 페이지 로드 1회.
 * visitorId는 forms origin의 1st-party 쿠키(UUID)로, "방문자(고유 사람)" 수 계산에 쓰인다 (ADR-0004).
 */
export const visits = pgTable(
  "visits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    linkId: text("link_id").references(() => distributionLinks.id, { onDelete: "set null" }),
    visitorId: text("visitor_id").notNull(),
    userAgent: text("user_agent"),
    referer: text("referer"),
    createdAt: createdAt(),
  },
  (t) => [
    index("visits_form_created_idx").on(t.formId, t.createdAt),
    index("visits_link_idx").on(t.linkId),
    index("visits_form_visitor_idx").on(t.formId, t.visitorId),
  ],
);

/**
 * 신청 1건 = CRM 명단의 한 행.
 * payload에 폼의 모든 필드를 그대로 저장하고, 자주 쓰는 연락처 필드는 컬럼으로 승격한다 (ADR-0003).
 */
export const leads = pgTable(
  "leads",
  {
    id: id(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    linkId: text("link_id").references(() => distributionLinks.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    payload: jsonb("payload").$type<Record<string, string | string[]>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("leads_form_created_idx").on(t.formId, t.createdAt),
    index("leads_link_idx").on(t.linkId),
    index("leads_email_idx").on(t.email),
    index("leads_form_visitor_idx").on(t.formId, t.visitorId),
  ],
);

// ────────────────────────────────────────────────────────────────────────────
// Relations (relational query API용)
// ────────────────────────────────────────────────────────────────────────────

export const operatorsRelations = relations(operators, ({ many }) => ({
  templates: many(htmlTemplates),
  campaigns: many(campaigns),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  operator: one(operators, { fields: [sessions.operatorId], references: [operators.id] }),
}));

export const htmlTemplatesRelations = relations(htmlTemplates, ({ one, many }) => ({
  operator: one(operators, { fields: [htmlTemplates.operatorId], references: [operators.id] }),
  forms: many(forms),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  operator: one(operators, { fields: [campaigns.operatorId], references: [operators.id] }),
  forms: many(forms),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [forms.campaignId], references: [campaigns.id] }),
  template: one(htmlTemplates, { fields: [forms.templateId], references: [htmlTemplates.id] }),
  links: many(distributionLinks),
  visits: many(visits),
  leads: many(leads),
}));

export const distributionLinksRelations = relations(distributionLinks, ({ one, many }) => ({
  form: one(forms, { fields: [distributionLinks.formId], references: [forms.id] }),
  visits: many(visits),
  leads: many(leads),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  form: one(forms, { fields: [visits.formId], references: [forms.id] }),
  link: one(distributionLinks, { fields: [visits.linkId], references: [distributionLinks.id] }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  form: one(forms, { fields: [leads.formId], references: [forms.id] }),
  link: one(distributionLinks, { fields: [leads.linkId], references: [distributionLinks.id] }),
}));

// 타입 export
export type Operator = typeof operators.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type HtmlTemplate = typeof htmlTemplates.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type DistributionLink = typeof distributionLinks.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type CampaignStatus = Campaign["status"];
export type Channel = DistributionLink["channel"];
