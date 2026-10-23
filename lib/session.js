import { subtle, getRandomValues } from "crypto";

export const SESSION_COOKIE = "arconet_session";
export const CLIENT_SESSION_COOKIE = "arconet_client_session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const newSessionId = () => globalThis.crypto.randomUUID();

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET no está configurado (o es muy corto). Definí uno de al menos 32 caracteres.",
    );
  }
  return secret;
}

function importKey() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(getSecret());
  return subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// base64url sobre bytes (no sobre texto): así el payload admite acentos y
// cualquier carácter UTF-8, y la firma se codifica igual que el payload.
function bytesToBase64url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToBytes(value) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Comparación en tiempo constante sin Buffer (proxy.js corre en el runtime
// edge, donde `Buffer` y `node:crypto` no están disponibles).
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payloadEncoded) {
  const key = await importKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadEncoded);
  const signature = await subtle.sign("HMAC", key, data);
  return bytesToBase64url(new Uint8Array(signature));
}

export async function createToken(user, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, sessionId = newSessionId()) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id ?? user.correo,
    nombre: user.nombre,
    correo: user.correo,
    rol: user.rol,
    sessionId,
    sucursal: user.sucursal ?? user.sucursalId ?? "",
    ...(user.tipo ? { tipo: user.tipo } : {}),
    ...(user.clienteId ? { clienteId: user.clienteId } : {}),
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encoded = bytesToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded);
  return { token: `${encoded}.${signature}`, maxAgeSeconds, sessionId };
}

export async function verifyToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  if (!safeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(encoded)));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return payload;
}

function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(user, { userAgent = null, preserveCurrent = false } = {}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  let currentSessionId = null;
  if (preserveCurrent) {
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
    currentSessionId = (await verifyToken(currentToken))?.sessionId || null;
  }
  const sessionId = currentSessionId || newSessionId();
  const { token, maxAgeSeconds } = await createToken(user, DEFAULT_MAX_AGE_SECONDS, sessionId);
  const prisma = (await import("./prisma")).prisma;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  await prisma.sesionUsuario.upsert({
    where: { sessionId },
    create: { id: newSessionId(), sessionId, usuarioId: user.id ?? user.sub, userAgent: userAgent?.slice(0, 400) || null, expiresAt },
    update: { userAgent: userAgent?.slice(0, 400) || undefined, expiresAt, revokedAt: null },
  });
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(maxAgeSeconds));
  return token;
}

export async function getSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (!session?.sessionId) return session;
  try {
    const prisma = (await import("./prisma")).prisma;
    const active = await prisma.sesionUsuario.findFirst({
      where: { sessionId: session.sessionId, usuarioId: session.sub, revokedAt: null, expiresAt: { gt: new Date() }, usuario: { activo: true } },
      select: { id: true },
    });
    return active ? session : null;
  } catch (error) {
    console.error("No se pudo validar la sesión administrativa", error?.message);
    return null;
  }
}

export async function deleteSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (session?.sessionId) {
    try {
      const prisma = (await import("./prisma")).prisma;
      await prisma.sesionUsuario.updateMany({ where: { sessionId: session.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch (error) {
      console.error("No se pudo cerrar la sesión administrativa", error?.message);
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function generateSecret() {
  const bytes = new Uint8Array(32);
  getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
