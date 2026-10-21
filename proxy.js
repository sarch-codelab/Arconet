import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "./lib/session";
import { checkRateLimit, getClientIp } from "./lib/rate-limit";

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

const MAX_BODY_BYTES = 1_000_000; // 1 MB default
const MAX_BODY_LARGE = 5_000_000; // 5 MB for endpoints that accept files

function maxBodyFor(pathname) {
  if (pathname.startsWith("/api/productos") || pathname.startsWith("/api/trabajadores")) {
    return MAX_BODY_LARGE;
  }
  return MAX_BODY_BYTES;
}

export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") {
    return handleOptions(request);
  }

  const ip = getClientIp(request);
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // Global per-IP abuse guard for all API routes.
  if (pathname.startsWith("/api/")) {
    const global = checkRateLimit(`global:${ip}`, { max: 300, windowMs: 60_000 });
    if (global.limited) {
      return new Response(
        JSON.stringify({ code: "rate_limit_exceeded", message: "Too many requests.", request_id: requestId }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(global.retryAfter),
            "X-RateLimit-Limit": String(global.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(global.reset),
            "X-Request-Id": requestId,
          },
        },
      );
    }
  }

  // Stricter limits for auth endpoints.
  if (pathname.startsWith("/api/auth/")) {
    const auth = checkRateLimit(`auth:${ip}`, { max: 20, windowMs: 15 * 60_000 });
    if (auth.limited) {
      return new Response(
        JSON.stringify({ code: "rate_limit_exceeded", message: "Too many authentication attempts.", request_id: requestId }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(auth.retryAfter),
            "X-RateLimit-Limit": String(auth.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(auth.reset),
            "X-Request-Id": requestId,
          },
        },
      );
    }
  }

  // Body size guard.
  if (["POST", "PUT", "PATCH"].includes(method) && pathname.startsWith("/api/")) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > maxBodyFor(pathname)) {
      return new Response(
        JSON.stringify({ code: "payload_too_large", message: "Request body too large.", request_id: requestId }),
        { status: 413, headers: { "Content-Type": "application/json", "X-Request-Id": requestId } },
      );
    }
  }

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
    const res = NextResponse.next();
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  if (isProtectedApi(pathname)) {
    if (!session) {
      const res = Response.json({ code: "unauthenticated", message: "No autenticado." }, { status: 401 });
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  // Public read endpoints: CORS for GET catalogo.
  const res = NextResponse.next();
  res.headers.set("X-Request-Id", requestId);
  if (pathname.startsWith("/api/catalogo") && method === "GET") {
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  } else if (pathname.startsWith("/api/")) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export function handleOptions(request) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/catalogo")) {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  return new Response(null, { status: 204 });
}

export const config = {
  matcher: [
    "/panel-administrativo/:path*",
    "/api/:path*",
  ],
};