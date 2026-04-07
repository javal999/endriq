import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthEnabled,
  verifySessionCookieValue,
} from "@/lib/session";

export async function middleware(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;
  const method = req.method;
  const session = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifySessionCookieValue(session);

  if (path === "/login") {
    return NextResponse.next();
  }
  if (path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (
    (path === "/api/admin/reset" || path === "/api/admin/diagnostics") &&
    method === "POST"
  ) {
    return NextResponse.next();
  }

  const protectedPages = ["/upload", "/submit", "/triage", "/groups"];
  if (protectedPages.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (!ok) {
      const login = new URL("/login", req.url);
      login.searchParams.set("returnTo", `${path}${req.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (path === "/api/upload" && method === "POST") {
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (path.startsWith("/api/issues")) {
    if (method === "POST" || method === "PATCH") {
      if (!ok) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  if (path.startsWith("/api/groups") && method === "POST") {
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (
    (path === "/api/classify" || path === "/api/similar") &&
    method === "POST"
  ) {
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
