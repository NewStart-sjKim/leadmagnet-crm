import { describe, expect, it, beforeEach } from "vitest";
import { db, visits, leads } from "@leadmagnet/db";
import { truncateAll } from "@leadmagnet/db/testing";
import { POST as upload } from "@/app/api/admin/templates/route";
import { POST as createCampaign, GET as listCampaigns } from "@/app/api/admin/campaigns/route";
import { GET as getCampaign, PATCH as patchCampaign, DELETE as deleteCampaign } from "@/app/api/admin/campaigns/[id]/route";
import { POST as createForm } from "@/app/api/admin/forms/route";
import { GET as getForm, PATCH as patchForm } from "@/app/api/admin/forms/[id]/route";
import { POST as createLink, GET as listLinks } from "@/app/api/admin/forms/[id]/links/route";
import { GET as campaignStats } from "@/app/api/admin/stats/campaigns/route";
import { GET as channelStats } from "@/app/api/admin/stats/channels/route";
import { GET as listLeads } from "@/app/api/admin/leads/route";
import { createOperator, loginAs, req, jsonReq, ctx, htmlFile, SAMPLE_HTML } from "./helpers";

async function setup() {
  const op = await createOperator();
  const cookie = await loginAs(op.email, op.password);
  const fd = new FormData();
  fd.append("file", htmlFile(SAMPLE_HTML));
  const tpl = (await (await upload(req("/api/admin/templates", { method: "POST", body: fd, cookie }), undefined as never)).json()).template;
  const camp = (await (await createCampaign(jsonReq("/api/admin/campaigns", { name: "캠페인 A" }, { cookie }), undefined as never)).json()).campaign;
  return { op, cookie, tpl, camp };
}

describe("캠페인 → 폼 → 배포 링크", () => {
  beforeEach(truncateAll);

  it("캠페인은 생성 즉시 ACTIVE 이고 목록에 나타난다", async () => {
    const { cookie, camp } = await setup();
    expect(camp.status).toBe("ACTIVE");
    const list = await (await listCampaigns(req("/api/admin/campaigns", { cookie }), undefined as never)).json();
    expect(list.campaigns.map((c: { id: string }) => c.id)).toEqual([camp.id]);
  });

  it("캠페인 이름이 비어 있으면 400", async () => {
    const { cookie } = await setup();
    expect((await createCampaign(jsonReq("/api/admin/campaigns", { name: "" }, { cookie }), undefined as never)).status).toBe(400);
  });

  it("템플릿으로 폼을 만들면 slug 와 공개 URL 이 생기고 HTML 이 스냅샷된다", async () => {
    const { cookie, tpl, camp } = await setup();
    const res = await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "전자책 신청" }, { cookie }), undefined as never);
    expect(res.status).toBe(201);
    const { form } = await res.json();
    expect(form.slug).toMatch(/^form-[a-z0-9]{8}$/);
    expect(form.publicUrl).toBe(`http://localhost:3001/f/${form.slug}`);
    const snap = await db.query.forms.findFirst({ where: (f, { eq }) => eq(f.id, form.id) });
    expect(snap!.htmlSnapshot).toBe(SAMPLE_HTML);
  });

  it("사용자 지정 slug 는 형식 검증되며 중복이면 409", async () => {
    const { cookie, tpl, camp } = await setup();
    const bad = await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t", slug: "Bad Slug!" }, { cookie }), undefined as never);
    expect(bad.status).toBe(400);
    const ok = await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t", slug: "ebook-2026" }, { cookie }), undefined as never);
    expect(ok.status).toBe(201);
    const dup = await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t2", slug: "ebook-2026" }, { cookie }), undefined as never);
    expect(dup.status).toBe(409);
  });

  it("존재하지 않는 캠페인/템플릿으로는 폼을 만들 수 없다 (404)", async () => {
    const { cookie, tpl, camp } = await setup();
    expect((await createForm(jsonReq("/api/admin/forms", { campaignId: "nope", templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).status).toBe(404);
    expect((await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: "nope", title: "t" }, { cookie }), undefined as never)).status).toBe(404);
  });

  it("4개 채널용 배포 링크를 만들고 채널 접두어 코드와 URL 을 받는다", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    const codes: Record<string, string> = {};
    for (const channel of ["INSTAGRAM", "X", "YOUTUBE", "THREADS"]) {
      const res = await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel }, { cookie }), ctx({ id: form.id }));
      expect(res.status).toBe(201);
      const { link } = await res.json();
      codes[channel] = link.code;
      expect(link.url).toBe(`http://localhost:3001/f/${form.slug}?c=${link.code}`);
    }
    expect(codes.INSTAGRAM).toMatch(/^ig_/);
    expect(codes.X).toMatch(/^x_/);
    expect(codes.YOUTUBE).toMatch(/^yt_/);
    expect(codes.THREADS).toMatch(/^th_/);
    const list = await (await listLinks(req(`/api/admin/forms/${form.id}/links`, { cookie }), ctx({ id: form.id }))).json();
    expect(list.links).toHaveLength(4);
  });

  it("지원하지 않는 채널은 400", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    expect((await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "TIKTOK" }, { cookie }), ctx({ id: form.id }))).status).toBe(400);
  });

  it("다른 운영자의 캠페인/폼은 보이지 않는다 (404)", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    const other = await createOperator("other@test.dev");
    const oc = await loginAs(other.email, other.password);
    expect((await getCampaign(req(`/api/admin/campaigns/${camp.id}`, { cookie: oc }), ctx({ id: camp.id }))).status).toBe(404);
    expect((await getForm(req(`/api/admin/forms/${form.id}`, { cookie: oc }), ctx({ id: form.id }))).status).toBe(404);
    expect((await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "X" }, { cookie: oc }), ctx({ id: form.id }))).status).toBe(404);
  });

  it("캠페인 상태 변경과 폼 비활성화가 반영된다", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    const p = await (await patchCampaign(jsonReq(`/api/admin/campaigns/${camp.id}`, { status: "PAUSED" }, { method: "PATCH", cookie }), ctx({ id: camp.id }))).json();
    expect(p.campaign.status).toBe("PAUSED");
    const f = await (await patchForm(jsonReq(`/api/admin/forms/${form.id}`, { isActive: false }, { method: "PATCH", cookie }), ctx({ id: form.id }))).json();
    expect(f.form.isActive).toBe(false);
  });

  it("캠페인 삭제 시 하위 폼/링크가 함께 삭제된다", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "X" }, { cookie }), ctx({ id: form.id }));
    expect((await deleteCampaign(req(`/api/admin/campaigns/${camp.id}`, { method: "DELETE", cookie }), ctx({ id: camp.id }))).status).toBe(200);
    expect(await db.query.forms.findMany()).toHaveLength(0);
    expect(await db.query.distributionLinks.findMany()).toHaveLength(0);
  });
});

describe("성과 집계", () => {
  beforeEach(truncateAll);

  it("캠페인별 방문/방문자/신청/전환율과 채널별 성과를 계산한다", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    const ig = (await (await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "INSTAGRAM" }, { cookie }), ctx({ id: form.id }))).json()).link;
    const yt = (await (await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "YOUTUBE" }, { cookie }), ctx({ id: form.id }))).json()).link;

    // 인스타: 방문자 A 3회 방문 + 신청, 방문자 B 1회 방문. 유튜브: 방문자 C 1회 방문 + 신청. 직접: 방문자 D 1회.
    await db.insert(visits).values([
      { formId: form.id, linkId: ig.id, visitorId: "A" },
      { formId: form.id, linkId: ig.id, visitorId: "A" },
      { formId: form.id, linkId: ig.id, visitorId: "A" },
      { formId: form.id, linkId: ig.id, visitorId: "B" },
      { formId: form.id, linkId: yt.id, visitorId: "C" },
      { formId: form.id, linkId: null, visitorId: "D" },
    ]);
    await db.insert(leads).values([
      { formId: form.id, linkId: ig.id, visitorId: "A", payload: { name: "a" } },
      { formId: form.id, linkId: yt.id, visitorId: "C", payload: { name: "c" } },
    ]);

    const cs = await (await campaignStats(req("/api/admin/stats/campaigns", { cookie }), undefined as never)).json();
    expect(cs.campaigns[0]).toMatchObject({ campaignId: camp.id, formCount: 1, visits: 6, visitors: 4, leads: 2, conversionRate: 0.5 });

    const ch = await (await channelStats(req(`/api/admin/stats/channels?campaignId=${camp.id}`, { cookie }), undefined as never)).json();
    const by = Object.fromEntries(ch.channels.map((c: { channel: string }) => [c.channel, c]));
    expect(by.INSTAGRAM).toMatchObject({ visits: 4, visitors: 2, leads: 1, conversionRate: 0.5 });
    expect(by.YOUTUBE).toMatchObject({ visits: 1, visitors: 1, leads: 1, conversionRate: 1 });
    expect(by.X).toMatchObject({ visits: 0, visitors: 0, leads: 0, conversionRate: 0 });
    expect(by.DIRECT).toMatchObject({ visits: 1, visitors: 1, leads: 0 });

    const ll = await (await listLeads(req(`/api/admin/leads?campaignId=${camp.id}`, { cookie }), undefined as never)).json();
    expect(ll.total).toBe(2);
    expect(ll.leads.map((l: { channel: string }) => l.channel).sort()).toEqual(["INSTAGRAM", "YOUTUBE"]);
  });

  it("다른 운영자의 데이터는 집계에 포함되지 않는다", async () => {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "t" }, { cookie }), undefined as never)).json();
    await db.insert(visits).values({ formId: form.id, visitorId: "A" });
    const other = await createOperator("other@test.dev");
    const oc = await loginAs(other.email, other.password);
    const cs = await (await campaignStats(req("/api/admin/stats/campaigns", { cookie: oc }), undefined as never)).json();
    expect(cs.campaigns).toEqual([]);
    const ll = await (await listLeads(req("/api/admin/leads", { cookie: oc }), undefined as never)).json();
    expect(ll.total).toBe(0);
  });
});
