import { subtle, getRandomValues } from "crypto";

export const SESSION_COOKIE = "arconet_session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET no está configurado (o es muy corto). Definé uno de al menos 32 caracteres.",
    );
  }
  return secret;
}

function base64url(input) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function importKey() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(getSecret());
  return subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(payloadEncoded) {
  const key = await importKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadEncoded);
  const signature = await subtle.sign("HMAC", key, data);
  return base64url(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createToken(user, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id ?? user.correo,
    nombre: user.nombre,
    correo: user.correo,
    rol: user.rol,
    sucursal: user.sucursal ?? user.sucursalId ?? "",
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = await sign(encoded);
  return { token: `${encoded}.${signature}`, maxAgeSeconds };
}

export async function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  const key = await importKey();
  const encoder = new TextEncoder();
  const sigData = encoder.encode(signature);
  const expData = encoder.encode(expected);
  const isValid = await subtle.verify("HMAC", key, sigData, expData);
  if (!isValid) return null;

  let payload;
  try {
    const decoder = new TextDecoder();
    const payloadBytes = new Uint8Array(encoded.length * 0.75);
    let j = 0;
    for (let i = 0; i < encoded.length; i += 4) {
      const chunk = encoded.slice(i, i + 4);
      const n = (chunk.charCodeAt(0) << 18) | (chunk.charCodeAt(1) << 12) | (chunk.charCodeAt(2) << 6) | chunk.charCodeAt(3);
      payloadBytes[j++] = (n >> 16) & 0xff;
      if (i + 2 < encoded.length) payloadBytes[j++] = (n >> 8) & 0xff;
      if (i + 3 < encoded.length) payloadBytes[j++] = n & 0xff;
    }
    payload = JSON.parse(decoder.decode(payloadBytes.slice(0, j)));
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

export async function createSession(user) {
  const { cookies } = await import("next/headers");
  const { token, maxAgeSeconds } = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(maxAgeSeconds));
  return token;
}

export async function getSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

export async function deleteSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function generateSecret() {
  const bytes = new Uint8Array(32);
  getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}