import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "crypto";

/**
 * 인증용 순수 crypto 헬퍼 (Supabase 의존 없음 → admin.ts / admin-actions.ts 양쪽 재사용).
 * Node 내장 crypto 만 사용하므로 추가 npm 의존성이 없다.
 */

const KEYLEN = 64;

/** 비밀번호 → `scrypt$<salt>$<hash>` 저장 문자열 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/** 평문 비밀번호가 저장 해시와 일치하는지 (timing-safe) */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = (stored ?? "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** 세션 쿠키 값 = `${userId}.${HMAC_sha256(userId, SESSION_SECRET)}` */
export function signSession(userId: string): string {
  const sig = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(userId)
    .digest("hex");
  return `${userId}.${sig}`;
}

/** 세션 토큰 검증 → 통과 시 userId, 아니면 null */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const userId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!userId || !sig) return null;
  const expected = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(userId)
    .digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}
