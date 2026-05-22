import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isSessionValueValid } from "./lib/auth-core";

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isSessionValueValid(cookie)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const path = request.nextUrl.pathname + request.nextUrl.search;
  if (path && path !== "/") loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
