import { NextRequest, NextResponse } from "next/server";

const STORE_PATH = /^\/([a-z0-9][a-z0-9-]{0,49})(?:\/|$)/;
const COOKIE_NAME = "simpinv_store";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(STORE_PATH);
  if (!match) return NextResponse.next();

  const slug = match[1];
  const current = req.cookies.get(COOKIE_NAME)?.value;
  if (current === slug) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(COOKIE_NAME, slug, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
