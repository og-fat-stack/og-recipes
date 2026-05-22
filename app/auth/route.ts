import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME, encodeSession } from "../../lib/auth-core";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function checkMagicKey(input: string): boolean {
  const expected = process.env.MAGIC_LINK_KEY;
  if (!expected) throw new Error("MAGIC_LINK_KEY is not set");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const next = safeNext(url.searchParams.get("next"));

  if (!checkMagicKey(key)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const expiresAt = Date.now() + ONE_YEAR_SECONDS * 1000;
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, encodeSession(expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return NextResponse.redirect(new URL(next, request.url));
}
