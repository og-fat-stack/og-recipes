import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** scrypt-Hash im Format `scrypt$salt$hash` (base64url). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password.normalize("NFC"), salt, KEY_LENGTH).toString(
    "base64url",
  );
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password.normalize("NFC"), salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
