import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function shortId(len = 8) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

/** 제목에서 URL-safe slug를 만들고 충돌 방지용 접미어를 붙인다. 한글 제목은 접두어 없이 랜덤만 사용. */
export function makeSlug(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base ? `${base}-${shortId(6)}` : `form-${shortId(8)}`;
}
