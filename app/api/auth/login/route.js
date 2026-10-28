import { prisma } from '@/lib/prisma";
import { verifyPassword } from '@/lib/auth";
import { createSession } from '@/lib/session";
import { writeLog } from '@/lib/logs";
import { decryptTotpSecret, verifyTotp } from '@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ENTRIES = 10000;

function cleanupRateLimit(now) {
  if (attempts.size < RATE_MAX_ENTRIES) return;
  for (const [key, entry] of attempts) {
    if (now > entry.reset) attempts.delete(key);
  }
}

function rateLimit(key, max = 10) {
  const now = Date.now();
  cleanupRateLimit(now);
  const entry = attempts.get(key);
  if (!entry || now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 256) : "";
  const ip = getClientIp(request);
  if (rateLimit(`ip:${ip}`, 30) || rateLimit(`acct:${email || "anon"}`, 10)) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }
  if (!email || !password) {
    return Response.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }

  let usuario;
  try {
    usuario = await prisma.usuario.findUnique({ where: { correo: email } });
  } catch (error) {
    console.error("POST /api/auth/login db", error?.message);
    return Response.json({ error: "Servicio no disponible. Intenta mas tarde." }, { status: 503 });
  }
  const dummyHash = "0000000000000000000000000000000000000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  const hashToCheck = usuario?.passwordHash ?? dummyHash;
  if (!usuario || !usuario.activo || !verifyPassword(password, hashToCheck)) {
    await writeLog("auth", `Intento de inicio de sesión fallido: ${email}`, {
      nivel: "warn",
      actor: email,
      ruta: "/api/auth/login",
    });
    return Response.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  if (usuario.twoFactorEnabled) {
    const code = typeof body?.codigo === "string" ? body.codigo : "";
    if (!code) return Response.json({ twoFactorRequired: true });
    if (!usuario.twoFactorSecret || !verifyTotp(decryptTotpSecret(usuario.twoFactorSecret), code)) {
      await writeLog("auth", `Código de verificación inválido: ${email}`, { nivel: "warn", actor: email, ruta: "/api/auth/login" });
      return Response.json({ error: "El código de verificación no es válido." }, { status: 401 });
    }
  }

  await createSession({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sucursal: usuario.sucursalId ?? "",
  }, { userAgent: request.headers.get("user-agent") });

  await writeLog("auth", `Inicio de sesión: ${usuario.correo}`, {
    actor: usuario.correo,
    ruta: "/api/auth/login",
    detalle: { rol: usuario.rol },
  });

  return Response.json({
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sucursal: usuario.sucursalId ?? "",
  });
}
