import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "./lib/session";

const PROTECTED_PAGES = "/panel-administrativo";
const PROTECTED_API = [
  "/api/productos",
  "/api/clientes",
  "/api/sucursales",
  "/api/trabajadores",
  "/api/ordenes",
];

function isProtectedApi(pathname) {
  return PROTECTED_API.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  if (
    pathname === PROTECTED_PAGES ||
    pathname.startsWith(`${PROTECTED_PAGES}/`)
  ) {
    if (!session) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isProtectedApi(pathname)) {
    if (!session) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/panel-administrativo/:path*",
    "/api/productos/:path*",
    "/api/clientes/:path*",
    "/api/sucursales/:path*",
    "/api/trabajadores/:path*",
    "/api/ordenes/:path*",
  ],
};
