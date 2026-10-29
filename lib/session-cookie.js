import { isLocalPreview } from "./local-preview";

export function sessionCookieOptions(maxAgeSeconds) {
  let embeddedLocalPreview = false;
  if (isLocalPreview()) {
    try {
      const origin = new URL(process.env.APP_ORIGIN);
      embeddedLocalPreview = origin.protocol === "https:" && origin.hostname.endsWith(".e2b.app");
    } catch {
      // Desarrollo por HTTP/local sin un origen de vista previa.
    }
  }
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || embeddedLocalPreview,
    // La demo se muestra en un iframe de otro sitio. CHIPS conserva la sesión
    // por sitio contenedor sin habilitar cookies de terceros en producción.
    sameSite: embeddedLocalPreview ? "none" : "lax",
    ...(embeddedLocalPreview ? { partitioned: true } : {}),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
