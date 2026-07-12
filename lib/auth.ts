import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  encodeSession,
  parseSessionValue,
} from "./auth-core";

/** userId der aktuellen Session, sonst null. */
export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies();
  return parseSessionValue(jar.get(SESSION_COOKIE_NAME)?.value);
}

export async function hasValidSession(): Promise<boolean> {
  return (await getSessionUserId()) !== null;
}

/** userId der Session — ohne gültige Session Redirect auf /login. */
export async function requireUserId(): Promise<number> {
  const userId = await getSessionUserId();
  if (userId == null) redirect("/login");
  return userId;
}

export async function setSession(userId: number): Promise<void> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const value = encodeSession(userId, expiresAt);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}
