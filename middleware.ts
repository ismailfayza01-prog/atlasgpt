import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "atlas_session";

function getSecret() {
  const s = process.env.ATLAS_SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(s);
}

async function readUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload as any)?.user ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals and public tracking
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/track") ||
    pathname === "/" ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Allow auth APIs without session
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const user = await readUser(req);
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access
  if (pathname.startsWith("/admin") && !["admin", "agent"].includes(user.role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/customer";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/customer") && user.role === "customer") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/customer") && user.role !== "customer") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\..*).*)"], // ignore static files
};
