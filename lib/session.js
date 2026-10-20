import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "arconet_session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET no está configurado (o es muy corto). Definé uno de al menos 32 caracteres.",
    );
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadEncoded) {
  return createHmac("sha256", getSecret())
    .update(payloadEncoded)
    .digest("base64url");
}

export function createToken(user, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
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
  const signature = sign(encoded);
  return { token: `${encoded}.${signature}`, maxAgeSeconds };
}

export function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
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
  const { token, maxAgeSeconds } = createToken(user);
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
  return randomBytes(32).toString("base64");
}
