// Códigos de un solo uso (verificación de correo y recuperación de
// contraseña). El código se guarda hasheado con scrypt; el texto plano solo
// viaja por correo. Un correo+tipo solo tiene un código vigente a la vez.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

export const TIPOS_TOKEN = ["recuperacion", "verificacion"];

function hash(codigo, salt) {
  return scryptSync(codigo, salt, 32).toString("hex");
}

function nuevoCodigo() {
  // 6 dígitos, fáciles de leer/teclear.
  return String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
}

/**
 * Crea (y reemplaza) un código vigente para un correo+tipo.
 * Devuelve { codigo, expiraAt } — el código en claro solo existe aquí.
 */
export async function crearTokenAcceso({ correo, tipo, ttlMinutes, ip = null }) {
  if (!TIPOS_TOKEN.includes(tipo)) throw new Error(`Tipo de token inválido: ${tipo}`);
  const codigo = nuevoCodigo();
  const salt = randomBytes(16).toString("hex");
  const expiraAt = new Date(Date.now() + ttlMinutes * 60_000);
  const codigoHash = `${salt}:${hash(codigo, salt)}`;
  await prisma.$transaction([
    // Un solo código vigente por correo+tipo.
    prisma.tokenAcceso.updateMany({
      where: { correo, tipo, usadoAt: null, expiraAt: { gt: new Date() } },
      data: { usadoAt: new Date() },
    }),
    prisma.tokenAcceso.create({ data: { correo, codigoHash, tipo, expiraAt, ip } }),
  ]);
  return { codigo, expiraAt };
}

/** Verifica y consume el código vigente. Lanza Error con mensaje apto para el usuario. */
export async function consumirTokenAcceso({ correo, tipo, codigo }) {
  const token = await prisma.tokenAcceso.findFirst({
    where: { correo, tipo, usadoAt: null, expiraAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const invalido = new Error("El código no es válido o ya expiró.");
  if (!token) throw invalido;
  const [salt, hashGuardado] = token.codigoHash.split(":");
  const intento = Buffer.from(hash(String(codigo).trim(), salt), "hex");
  const guardado = Buffer.from(hashGuardado, "hex");
  const ok = intento.length === guardado.length && timingSafeEqual(intento, guardado);
  if (!ok) throw invalido;
  await prisma.tokenAcceso.update({ where: { id: token.id }, data: { usadoAt: new Date() } });
  return true;
}

/** Limpieza de códigos expirados (llamar desde el monitoreo). */
export async function limpiarTokensExpirados() {
  const result = await prisma.tokenAcceso.deleteMany({
    where: { expiraAt: { lt: new Date(Date.now() - 7 * 24 * 3_600_000) } },
  });
  return result.count;
}
