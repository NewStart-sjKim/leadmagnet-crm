import { describe, expect, it, beforeEach } from "vitest";
import { db, visits, leads } from "@leadmagnet/db";
import { truncateAll } from "@leadmagnet/db/testing";
import { POST as upload } from "@/app/api/admin/templates/route";
import { POST as createCampaign, GET as listCampaigns } from "@/app/api/admin/campaigns/route";
import { GET as getCampaign, PATCH as patchCampaign, DELETE as deleteCampaign } from "@/app/api/admin/campaigns/[id]/route";
import { POST as createForm } from "@/app/api/admin/forms/route";
import { GET as getForm, PATCH as patchForm } from "@/app/api/admin/forms/[id]/route";
import { POST as createLink, GET as listLinks } from "@/app/api/admin/forms/[id]/links/route";
import { DELETE as deleteLink } from "@/app/api/admin/forms/[id]/links/[linkId]/route";
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

describe("CRM 명단 검색 · CSV 내보내기", () => {
  beforeEach(truncateAll);

  async function seedLeads() {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "폼" }, { cookie }), undefined as never)).json();
    const ig = (await (await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "INSTAGRAM", label: "프로필" }, { cookie }), ctx({ id: form.id }))).json()).link;
    await db.insert(leads).values([
      { formId: form.id, linkId: ig.id, visitorId: "A", name: "김철수", email: "chul@example.com", phone: "010-1111-2222", payload: { name: "김철수", email: "chul@example.com", phone: "010-1111-2222", job: "마케터" } },
      { formId: form.id, linkId: null, visitorId: "B", name: "Lee, Young", email: "YOUNG@example.com", phone: null, payload: { name: "Lee, Young", email: "YOUNG@example.com", memo: '=HYPERLINK("x")' } },
    ]);
    return { cookie, camp, form };
  }

  it("q 로 이름·이메일·연락처를 대소문자 구분 없이 부분 검색한다", async () => {
    const { cookie } = await seedLeads();
    const find = async (q: string) =>
      (await (await listLeads(req(`/api/admin/leads?q=${encodeURIComponent(q)}`, { cookie }), undefined as never)).json()).leads.map((l: { name: string | null }) => l.name);
    expect(await find("철수")).toEqual(["김철수"]);
    expect(await find("young@")).toEqual(["Lee, Young"]); // 대소문자 무시
    expect(await find("1111")).toEqual(["김철수"]); // 연락처
    expect(await find("%")).toEqual([]); // 와일드카드 문자는 리터럴로 취급
    expect(await find("없는사람")).toEqual([]);
  });

  it("밑줄(_)이 든 이메일도 검색된다 — _ 는 LIKE 와일드카드가 아니라 글자로 취급", async () => {
    const { cookie, form } = await seedLeads();
    await db.insert(leads).values([
      { formId: form.id, linkId: null, visitorId: "C", name: "밑줄", email: "under_score@example.com", phone: null, payload: { email: "under_score@example.com" } },
      { formId: form.id, linkId: null, visitorId: "D", name: "엑스", email: "underXscore@example.com", phone: null, payload: { email: "underXscore@example.com" } },
    ]);
    const find = async (q: string) =>
      (await (await listLeads(req(`/api/admin/leads?q=${encodeURIComponent(q)}`, { cookie }), undefined as never)).json()).leads.map((l: { email: string | null }) => l.email);
    expect(await find("under_score")).toEqual(["under_score@example.com"]); // 이스케이프가 깨지면 [] 가 된다
    expect(await find("r_s")).toEqual(["under_score@example.com"]); // _ 가 와일드카드였다면 underXscore 도 걸린다
  });

  it("format=csv 는 BOM 포함 UTF-8 CSV 를 내려주고 셀을 안전하게 이스케이프한다", async () => {
    const { cookie, camp } = await seedLeads();
    const res = await listLeads(req(`/api/admin/leads?format=csv&campaignId=${camp.id}`, { cookie }), undefined as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/);

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // 엑셀 한글 호환 BOM (text() 는 BOM 을 제거하므로 바이트로 확인)
    const lines = new TextDecoder().decode(bytes).trimEnd().split("\r\n");
    expect(lines[0]).toBe("신청 시각,캠페인,폼,채널,링크 라벨,이름,이메일,연락처,email,job,memo,name,phone");
    expect(lines).toHaveLength(3);

    const young = lines.find((l) => l.includes("YOUNG"))!;
    expect(young).toContain('"Lee, Young"'); // 콤마 → 따옴표로 감싸기
    expect(young).toContain('\'=HYPERLINK(""x"")'); // 수식 인젝션 방지 + 내부 따옴표 이중화
    expect(young).toContain(",DIRECT,"); // 링크 없는 신청은 DIRECT
    expect(lines.find((l) => l.includes("김철수"))).toContain(",INSTAGRAM,프로필,");
  });

  it("CSV 도 다른 운영자의 명단은 포함하지 않는다", async () => {
    await seedLeads();
    const other = await createOperator("other@test.dev");
    const oc = await loginAs(other.email, other.password);
    const text = await (await listLeads(req("/api/admin/leads?format=csv", { cookie: oc }), undefined as never)).text();
    expect(text.trimEnd().split("\r\n")).toHaveLength(1); // 헤더만 (text() 가 BOM 을 제거함)
  });
});

describe("배포 링크 삭제", () => {
  beforeEach(truncateAll);

  async function setupLink() {
    const { cookie, tpl, camp } = await setup();
    const { form } = await (await createForm(jsonReq("/api/admin/forms", { campaignId: camp.id, templateId: tpl.id, title: "폼" }, { cookie }), undefined as never)).json();
    const mk = async (label: string) =>
      (await (await createLink(jsonReq(`/api/admin/forms/${form.id}/links`, { channel: "INSTAGRAM", label }, { cookie }), ctx({ id: form.id }))).json()).link;
    return { cookie, form, mk };
  }

  it("트래픽이 없는 링크는 삭제된다", async () => {
    const { cookie, form, mk } = await setupLink();
    const keep = await mk("프로필");
    const drop = await mk("잘못 만듦");

    const res = await deleteLink(req(`/api/admin/forms/${form.id}/links/${drop.id}`, { method: "DELETE", cookie }), ctx({ id: form.id, linkId: drop.id }));
    expect(res.status).toBe(200);

    const { links } = await (await listLinks(req(`/api/admin/forms/${form.id}/links`, { cookie }), ctx({ id: form.id }))).json();
    expect(links.map((l: { id: string }) => l.id)).toEqual([keep.id]);
  });

  it("방문·신청이 기록된 링크는 409 로 거부한다 (삭제하면 성과가 DIRECT 로 왜곡되므로)", async () => {
    const { cookie, form, mk } = await setupLink();
    const used = await mk("스토리");
    await db.insert(visits).values({ formId: form.id, linkId: used.id, visitorId: "A" });
    await db.insert(leads).values({ formId: form.id, linkId: used.id, visitorId: "A", payload: { name: "a" } });

    const res = await deleteLink(req(`/api/admin/forms/${form.id}/links/${used.id}`, { method: "DELETE", cookie }), ctx({ id: form.id, linkId: used.id }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/방문 1건 · 신청 1건/);

    // 링크와 성과가 모두 그대로 남아 있어야 한다
    const { links } = await (await listLinks(req(`/api/admin/forms/${form.id}/links`, { cookie }), ctx({ id: form.id }))).json();
    expect(links).toHaveLength(1);
    const ch = await (await channelStats(req(`/api/admin/stats/channels?formId=${form.id}`, { cookie }), undefined as never)).json();
    expect(ch.channels.find((c: { channel: string }) => c.channel === "INSTAGRAM")).toMatchObject({ visits: 1, leads: 1 });
  });

  it("다른 운영자의 링크는 삭제할 수 없다 (404)", async () => {
    const { form, mk } = await setupLink();
    const link = await mk("프로필");
    const other = await createOperator("other@test.dev");
    const oc = await loginAs(other.email, other.password);

    const res = await deleteLink(req(`/api/admin/forms/${form.id}/links/${link.id}`, { method: "DELETE", cookie: oc }), ctx({ id: form.id, linkId: link.id }));
    expect(res.status).toBe(404);
  });
});
