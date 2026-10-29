import { isLocalPreview, PREVIEW_SESSION_HEADER } from "./local-preview";

const STORAGE_KEYS = {
  admin: "arconet-local-admin-session",
  cliente: "arconet-local-client-session",
};
const memorySessions = new Map();
const validToken = value => typeof value === "string" && value.length <= 8192 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

export function rememberLocalPreviewSession(kind, token) {
  if (!isLocalPreview() || typeof window === "undefined" || !STORAGE_KEYS[kind] ||
      !validToken(token)) return;
  // Por pestaña, nunca en URLs, logs o localStorage. Solo existe en la demo.
  memorySessions.set(kind, token);
  try { window.sessionStorage.setItem(STORAGE_KEYS[kind], token); } catch { /* Se conserva solo en memoria de esta pestaña. */ }
}

export function getLocalPreviewSession(kind) {
  if (!isLocalPreview() || typeof window === "undefined" || !STORAGE_KEYS[kind]) return null;
  let token = memorySessions.get(kind);
  try { token = window.sessionStorage.getItem(STORAGE_KEYS[kind]) || token; } catch { /* Memoria de esta pestaña como alternativa. */ }
  return validToken(token) ? token : null;
}

export function clearLocalPreviewSession(kind) {
  memorySessions.delete(kind);
  if (typeof window === "undefined" || !STORAGE_KEYS[kind]) return;
  try { window.sessionStorage.removeItem(STORAGE_KEYS[kind]); } catch { /* Storage restringido. */ }
}

export async function apiFetch(input, init, kind = "admin") {
  if (isLocalPreview() && typeof window !== "undefined" && init?.credentials !== "omit") {
    try {
      const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
      const url = new URL(request ? request.url : String(input), window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
        const token = getLocalPreviewSession(kind);
        if (token) {
          const headers = new Headers(init?.headers ?? request?.headers);
          if (!headers.has(PREVIEW_SESSION_HEADER)) headers.set(PREVIEW_SESSION_HEADER, token);
          return globalThis.fetch(input, { ...init, headers });
        }
      }
    } catch {
      // No bloquear la autenticación por cookies si el navegador niega storage.
    }
  }
  return globalThis.fetch(input, init);
}

export function clientApiFetch(input, init) {
  return apiFetch(input, init, "cliente");
}
