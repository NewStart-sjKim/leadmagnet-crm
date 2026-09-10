import { db, campaigns, forms, visits, leads, distributionLinks, eq, and, count, countDistinct, isNotNull, sql } from "@leadmagnet/db";
import type { ChannelValue } from "@leadmagnet/shared";

/**
 * 지표 정의 (ADR-0004)
 * - 방문(visits): 공개 폼 페이지 로드 횟수
 * - 방문자(visitors): 고유 visitor_id 수 (forms origin 1st-party 쿠키)
 * - 신청(leads): 저장된 리드 수
 * - 전환율(conversionRate): 신청 / 방문자 (방문자 0이면 0)
 */
export type Metrics = { visits: number; visitors: number; leads: number; conversionRate: number };

function rate(l: number, v: number) {
  return v === 0 ? 0 : Math.round((l / v) * 10000) / 10000;
}

export type CampaignStats = {
  campaignId: string;
  name: string;
  status: string;
  formCount: number;
} & Metrics;

export async function campaignStats(operatorId: string): Promise<CampaignStats[]> {
  const base = await db
    .select({
      campaignId: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      formCount: count(forms.id),
    })
    .from(campaigns)
    .leftJoin(forms, eq(forms.campaignId, campaigns.id))
    .where(eq(campaigns.operatorId, operatorId))
    .groupBy(campaigns.id)
    .orderBy(campaigns.createdAt);

  const v = await db
    .select({
      campaignId: forms.campaignId,
      visits: count(visits.id),
      visitors: countDistinct(visits.visitorId),
    })
    .from(visits)
    .innerJoin(forms, eq(forms.id, visits.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(eq(campaigns.operatorId, operatorId))
    .groupBy(forms.campaignId);

  const l = await db
    .select({ campaignId: forms.campaignId, leads: count(leads.id) })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(eq(campaigns.operatorId, operatorId))
    .groupBy(forms.campaignId);

  const vm = new Map(v.map((r) => [r.campaignId, r]));
  const lm = new Map(l.map((r) => [r.campaignId, r.leads]));

  return base.map((c) => {
    const vv = vm.get(c.campaignId);
    const visitsN = vv?.visits ?? 0;
    const visitorsN = vv?.visitors ?? 0;
    const leadsN = lm.get(c.campaignId) ?? 0;
    return { ...c, visits: visitsN, visitors: visitorsN, leads: leadsN, conversionRate: rate(leadsN, visitorsN) };
  });
}

export type ChannelStats = { channel: ChannelValue | "DIRECT" } & Metrics;

/** 채널별 성과. campaignId/formId 로 범위를 좁힐 수 있다. 링크 없이 들어온 방문은 DIRECT 로 묶는다. */
export async function channelStats(operatorId: string, scope: { campaignId?: string; formId?: string } = {}): Promise<ChannelStats[]> {
  const scopeWhere = and(
    eq(campaigns.operatorId, operatorId),
    scope.campaignId ? eq(forms.campaignId, scope.campaignId) : undefined,
    scope.formId ? eq(forms.id, scope.formId) : undefined,
  );
  const channelExpr = sql<string>`coalesce(${distributionLinks.channel}::text, 'DIRECT')`;

  const v = await db
    .select({ channel: channelExpr, visits: count(visits.id), visitors: countDistinct(visits.visitorId) })
    .from(visits)
    .innerJoin(forms, eq(forms.id, visits.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .leftJoin(distributionLinks, eq(distributionLinks.id, visits.linkId))
    .where(scopeWhere)
    .groupBy(channelExpr);

  const l = await db
    .select({ channel: channelExpr, leads: count(leads.id) })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .leftJoin(distributionLinks, eq(distributionLinks.id, leads.linkId))
    .where(scopeWhere)
    .groupBy(channelExpr);

  const order: ChannelStats["channel"][] = ["INSTAGRAM", "X", "YOUTUBE", "THREADS", "DIRECT"];
  const vm = new Map(v.map((r) => [r.channel, r]));
  const lm = new Map(l.map((r) => [r.channel, r.leads]));

  return order.map((ch) => {
    const vv = vm.get(ch);
    const visitsN = vv?.visits ?? 0;
    const visitorsN = vv?.visitors ?? 0;
    const leadsN = lm.get(ch) ?? 0;
    return { channel: ch, visits: visitsN, visitors: visitorsN, leads: leadsN, conversionRate: rate(leadsN, visitorsN) };
  });
}

/** 폼 단위 요약(캠페인 상세 페이지용) */
export async function formStats(campaignId: string) {
  const v = await db
    .select({ formId: visits.formId, visits: count(visits.id), visitors: countDistinct(visits.visitorId) })
    .from(visits)
    .innerJoin(forms, eq(forms.id, visits.formId))
    .where(eq(forms.campaignId, campaignId))
    .groupBy(visits.formId);
  const l = await db
    .select({ formId: leads.formId, leads: count(leads.id) })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .where(eq(forms.campaignId, campaignId))
    .groupBy(leads.formId);
  const lm = new Map(l.map((r) => [r.formId, r.leads]));
  const out = new Map<string, Metrics>();
  for (const r of v) out.set(r.formId, { visits: r.visits, visitors: r.visitors, leads: lm.get(r.formId) ?? 0, conversionRate: rate(lm.get(r.formId) ?? 0, r.visitors) });
  for (const [formId, n] of lm) if (!out.has(formId)) out.set(formId, { visits: 0, visitors: 0, leads: n, conversionRate: 0 });
  return out;
}

/**
 * 링크 단위 성과 (캠페인 상세의 배포 링크 목록용).
 * 같은 채널에 여러 링크를 만드는 이유가 여기에 있다 — 프로필/스토리처럼 붙인 위치별로 성과를 비교한다.
 */
export async function linkStats(campaignId: string) {
  const v = await db
    .select({ linkId: visits.linkId, visits: count(visits.id), visitors: countDistinct(visits.visitorId) })
    .from(visits)
    .innerJoin(forms, eq(forms.id, visits.formId))
    .where(and(eq(forms.campaignId, campaignId), isNotNull(visits.linkId)))
    .groupBy(visits.linkId);
  const l = await db
    .select({ linkId: leads.linkId, leads: count(leads.id) })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .where(and(eq(forms.campaignId, campaignId), isNotNull(leads.linkId)))
    .groupBy(leads.linkId);

  const lm = new Map(l.map((r) => [r.linkId!, r.leads]));
  const out = new Map<string, Metrics>();
  for (const r of v) {
    const n = lm.get(r.linkId!) ?? 0;
    out.set(r.linkId!, { visits: r.visits, visitors: r.visitors, leads: n, conversionRate: rate(n, r.visitors) });
  }
  // 방문 없이 신청만 기록된 경우(쿠키 차단 등)도 빠뜨리지 않는다
  for (const [linkId, n] of lm) if (!out.has(linkId)) out.set(linkId, { visits: 0, visitors: 0, leads: n, conversionRate: 0 });
  return out;
}
