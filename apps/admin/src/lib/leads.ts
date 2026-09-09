import { db, leads, forms, campaigns, distributionLinks, eq, and, desc, count } from "@leadmagnet/db";

export async function fetchLeads(operatorId: string, opts: { campaignId?: string; formId?: string; page: number; pageSize: number }) {
  const where = and(
    eq(campaigns.operatorId, operatorId),
    opts.campaignId ? eq(forms.campaignId, opts.campaignId) : undefined,
    opts.formId ? eq(leads.formId, opts.formId) : undefined,
  );
  const rows = await db
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
    .where(where)
    .orderBy(desc(leads.createdAt))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize);
  const [totalRow] = await db
    .select({ n: count() })
    .from(leads)
    .innerJoin(forms, eq(forms.id, leads.formId))
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(where);
  return { leads: rows, total: totalRow?.n ?? 0, page: opts.page, pageSize: opts.pageSize };
}
export type LeadRow = Awaited<ReturnType<typeof fetchLeads>>["leads"][number];
