import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "og_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Session-Wert: `userId.expiresAt.signatur`. */
export function encodeSession(userId: number, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Liefert die userId einer gültigen Session, sonst null. */
export function parseSessionValue(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [uidStr, expStr, sig] = parts;
  const userId = Number(uidStr);
  const expiresAt = Number(expStr);
  if (!Number.isInteger(userId) || userId < 1) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  const expected = sign(`${uidStr}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}

export function isSessionValueValid(value: string | undefined): boolean {
  return parseSessionValue(value) !== null;
}
