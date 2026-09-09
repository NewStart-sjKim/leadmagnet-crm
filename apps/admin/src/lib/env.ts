export const env = {
  formsOrigin: (process.env.FORMS_ORIGIN ?? "http://localhost:3001").replace(/\/$/, ""),
  adminOrigin: (process.env.ADMIN_ORIGIN ?? "http://localhost:3000").replace(/\/$/, ""),
};

export function publicFormUrl(slug: string, code?: string) {
  const u = new URL(`/f/${slug}`, env.formsOrigin);
  if (code) u.searchParams.set("c", code);
  return u.toString();
}
