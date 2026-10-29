import { isLocalPreview, PREVIEW_SESSION_HEADER } from "./local-preview";

// La alternativa sin cookies solo puede autorizar la base desechable. Nunca
// aceptar estas cabeceras contra otra base ni en una compilación de producción.
export function isLocalPreviewAuthEnabled(env = process.env) {
  if (env.NODE_ENV !== "development" || env.NEXT_PUBLIC_LOCAL_PREVIEW !== "1") return false;
  try {
    const url = new URL(env.DATABASE_URL);
    return ["postgresql:", "postgres:"].includes(url.protocol) &&
      url.hostname === "127.0.0.1" && url.port === "55432" &&
      url.username === "arconet_local" && url.pathname === "/arconet_local" &&
      ![...url.searchParams.keys()].some(key => key !== "schema");
  } catch {
    return false;
  }
}

export function getLocalPreviewToken(headers) {
  if (!isLocalPreview() || !isLocalPreviewAuthEnabled()) return null;
  const value = headers?.get(PREVIEW_SESSION_HEADER);
  if (typeof value !== "string" || value.length > 8192) return null;
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
