import { getLocalPreviewToken, isLocalPreviewAuthEnabled } from "./lib/local-preview-auth";
import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE, CLIENT_SESSION_COOKIE } from "./lib/session";
import { checkRateLimit, getClientIp } from "./lib/rate-limit";
import { publicPageForPath } from "./lib/public-pages";

const PROTECTED_PAGES = "/panel-administrativo";
const PROTECTED_API = [
  "/api/productos",
  "/api/clientes",
  "/api/sucursales",
  "/api/trabajadores",
  "/api/ordenes",
  "/api/ventas",
  "/api/compras",
  "/api/roles",
  "/api/logs",
  "/api/monitor",
];

function isProtectedApi(pathname) {
  return PROTECTED_API.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

// verifyToken es async: sin `await`, la sesión sería un Promise (siempre
// truthy) y las comprobaciones de abajo nunca bloquearían nada.
async function readSession(request) {
  const token = getLocalPreviewToken(request.headers) || request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  return session?.tipo === "cliente" ? null : session;
}

const MAX_BODY_BYTES = 1_000_000; // 1 MB default
const MAX_BODY_LARGE = 5_000_000; // 5 MB for endpoints that accept files

function maxBodyFor(pathname) {
  // Productos y trabajadores pueden llevar una galería de fotos; clientes y el
  // perfil solo una. El límite por defecto (1 MB) se queda corto al guardar una
  // imagen junto con el resto del formulario.
  if (pathname.startsWith("/api/productos") || pathname.startsWith("/api/trabajadores")) {
    return MAX_BODY_LARGE;
  }
  if (pathname.startsWith("/api/clientes") || pathname === "/api/perfil" || pathname.startsWith("/api/categorias")) {
    return 2_000_000;
  }
  return MAX_BODY_BYTES;
}

export default async function proxy(request) {
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
  if (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/qr") {
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

  const publicPage = (method === "GET" || method === "HEAD") && publicPageForPath(pathname);
  if (publicPage) {
    // Proxy de Next 16 usa Node. La consulta solo corre en rutas públicas de
    // contenido, nunca en recursos ni accesos administrativos.
    const { cachedPublicPages } = await import("./lib/public-pages-service");
    const pages = await cachedPublicPages();
    if (pages[publicPage.id] === false) {
      const url = new URL("/pagina-no-disponible", request.url);
      url.searchParams.set("pagina", publicPage.id);
      const res = NextResponse.redirect(url, 307);
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  const session = await readSession(request);

  if (
    pathname === PROTECTED_PAGES ||
    pathname.startsWith(`${PROTECTED_PAGES}/`)
  ) {
    if (!session && !isLocalPreviewAuthEnabled()) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // En la demo solo se sirve la carcasa del panel. Los datos siguen
    // protegidos en cada API con firma, sesión vigente y permisos reales.
    const res = NextResponse.next();
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  if (isProtectedApi(pathname)) {
    let authorizedSession = session;
    if (
      !authorizedSession &&
      pathname === "/api/ordenes" &&
      (method === "GET" || method === "POST")
    ) {
      const clientToken = getLocalPreviewToken(request.headers) || request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
      const clientSession = await verifyToken(clientToken);
      if (clientSession?.tipo === "cliente" && clientSession.clienteId) {
        authorizedSession = clientSession;
      }
    }
    if (!authorizedSession) {
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
    "/catalogo/:path*",
    "/tienda/:path*",
    "/contacto",
    "/ayuda",
    "/garantias",
    "/terminos",
    "/privacidad",
    "/cookies",
    "/aviso-legal",
  ],
};
