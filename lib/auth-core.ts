import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "og_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", getSecret())
    .update(String(expiresAt))
    .digest("base64url");
}

export function encodeSession(expiresAt: number): string {
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isSessionValueValid(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt <= Date.now()) return false;
  const expected = sign(expiresAt);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
