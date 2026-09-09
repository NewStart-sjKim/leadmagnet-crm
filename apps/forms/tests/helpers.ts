import { NextRequest } from "next/server";
import { db, operators, htmlTemplates, campaigns, forms, distributionLinks } from "@leadmagnet/db";

export const BASE = "http://localhost:3001";

export function req(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(new URL(path, BASE), { ...init, headers } as never);
}

export function jsonReq(path: string, body: unknown, cookie?: string) {
  return req(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cookie });
}

export const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

export const SAMPLE_HTML = `<!doctype html><html><head><title>t</title></head><body><h1>신청</h1><form><input name="이름" required><input name="email" type="email"><input type="checkbox" name="topics" value="a"><input type="checkbox" name="topics" value="b"><button>보내기</button></form></body></html>`;

/** 운영자 → 템플릿 → 캠페인 → 폼 → 채널 링크(인스타/X) 를 한 번에 만든다 */
export async function seedForm(opts: { html?: string; slug?: string; isActive?: boolean; campaignStatus?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT" } = {}) {
  const [op] = await db.insert(operators).values({ email: `op-${Math.random()}@t.dev`, passwordHash: "x", name: "op" }).returning();
  const html = opts.html ?? SAMPLE_HTML;
  const [tpl] = await db.insert(htmlTemplates).values({ operatorId: op!.id, name: "t", fileName: "t.html", html, sizeBytes: html.length, fieldNames: [] }).returning();
  const [camp] = await db.insert(campaigns).values({ operatorId: op!.id, name: "c", status: opts.campaignStatus ?? "ACTIVE" }).returning();
  const [form] = await db
    .insert(forms)
    .values({ campaignId: camp!.id, templateId: tpl!.id, slug: opts.slug ?? `form-${Math.random().toString(36).slice(2, 10)}`, title: "폼", htmlSnapshot: html, isActive: opts.isActive ?? true, successMessage: "완료!" })
    .returning();
  const [ig] = await db.insert(distributionLinks).values({ formId: form!.id, channel: "INSTAGRAM", code: `ig_${rand()}` }).returning();
  const [x] = await db.insert(distributionLinks).values({ formId: form!.id, channel: "X", code: `x_${rand()}` }).returning();
  return { op: op!, tpl: tpl!, camp: camp!, form: form!, ig: ig!, x: x! };
}

const rand = () => Math.random().toString(36).slice(2, 9);

export function cookieOf(res: Response, name: string) {
  const all = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const c = all.find((s) => s.startsWith(name + "="));
  return c ? c.split(";")[0]! : null;
}
