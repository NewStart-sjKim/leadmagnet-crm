import Link from "next/link";
import { notFound } from "next/navigation";
import { db, campaigns, htmlTemplates, eq, and, desc } from "@leadmagnet/db";
import { getCurrentOperator } from "@/lib/session";
import { campaignStats, channelStats, formStats, linkStats } from "@/lib/stats";
import { publicFormUrl, env } from "@/lib/env";
import { PageHeader, StatTiles, Empty } from "@/components/ui";
import { ChannelTable } from "@/components/channel-table";
import { CampaignStatusControl } from "@/components/campaign-status";
import { CreateForm } from "@/components/create-form";
import { FormCard } from "@/components/form-card";
import { LeadsTable } from "@/components/leads-table";
import { fetchLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const op = (await getCurrentOperator())!;
  const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.operatorId, op.id))).limit(1);
  if (!campaign) notFound();

  const [stats, ch, fs, ls, formRows, templates, leadPage] = await Promise.all([
    campaignStats(op.id).then((all) => all.find((c) => c.campaignId === id)!),
    channelStats(op.id, { campaignId: id }),
    formStats(id),
    linkStats(id),
    db.query.forms.findMany({ where: (f, { eq }) => eq(f.campaignId, id), with: { links: true }, orderBy: (f, { desc }) => desc(f.createdAt) }),
    db.select({ id: htmlTemplates.id, name: htmlTemplates.name }).from(htmlTemplates).where(eq(htmlTemplates.operatorId, op.id)).orderBy(desc(htmlTemplates.createdAt)),
    fetchLeads(op.id, { campaignId: id, page: 1, pageSize: 20 }),
  ]);

  return (
    <>
      <div className="mb-2 text-xs text-neutral-500"><Link href="/campaigns" className="hover:underline">캠페인</Link> / {campaign.name}</div>
      <PageHeader title={campaign.name} description={campaign.description ?? undefined} actions={<CampaignStatusControl id={campaign.id} status={campaign.status} />} />
      <StatTiles m={stats} />

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">신청 폼 · 배포 링크</h2>
          <CreateForm campaignId={campaign.id} templates={templates} />
        </div>
        <div>
          {formRows.length === 0 ? (
            <Empty>{templates.length === 0 ? <>먼저 <Link className="underline" href="/templates">HTML 템플릿</Link>을 등록한 뒤 폼을 만들 수 있습니다.</> : "위 “+ 새 신청 폼”으로 첫 신청 폼을 만들어 보세요."}</Empty>
          ) : (
            <div className="space-y-4">
              {formRows.map((f) => (
                <FormCard
                  key={f.id}
                  form={{ id: f.id, slug: f.slug, title: f.title, isActive: f.isActive, publicUrl: publicFormUrl(f.slug), previewUrl: `${env.formsOrigin}/p/${f.slug}` }}
                  links={f.links.map((l) => ({ ...l, url: publicFormUrl(f.slug, l.code), metrics: ls.get(l.id) ?? { visits: 0, visitors: 0, leads: 0, conversionRate: 0 } }))}
                  stats={fs.get(f.id) ?? { visits: 0, visitors: 0, leads: 0, conversionRate: 0 }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">채널별 성과</h2>
        <ChannelTable rows={ch} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">최근 신청 (CRM 명단)</h2>
          <Link href={`/leads?campaignId=${campaign.id}`} className="text-xs text-neutral-500 hover:underline">전체 보기 →</Link>
        </div>
        <LeadsTable rows={leadPage.leads} />
      </section>
    </>
  );
}
