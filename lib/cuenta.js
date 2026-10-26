// Utilidades comunes a las cuentas con acceso: trabajadores (tabla Usuario,
// panel administrativo) y clientes (ClienteCuenta, portal de clientes).
// Un mismo correo puede pertenecer a una sola de las dos tablas; cuando no
// existe no se revela al solicitante (evita enumerar cuentas).

import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { crearTokenAcceso } from "./tokens";
import { sendEmail, emailRecuperacion, emailVerificacion } from "./email";

/** Los correos se comparan y guardan siempre en minúsculas. */
export function normalizarCorreo(correo) {
  return String(correo || "").trim().toLowerCase().slice(0, 254);
}

/**
 * Busca una cuenta habilitada por correo. Devuelve
 * { tipo, id, nombre, correo, verificadoAt } o null.
 * Las cuentas desactivadas se tratan como inexistentes.
 */
export async function buscarCuentaPorCorreo(correo) {
  const clave = normalizarCorreo(correo);
  if (!clave || !clave.includes("@")) return null;

  const [usuario, cliente] = await Promise.all([
    prisma.usuario.findFirst({
      where: { correo: { equals: clave, mode: "insensitive" } },
      select: { id: true, nombre: true, correo: true, activo: true, verificadoAt: true },
    }),
    prisma.clienteCuenta.findFirst({
      where: { correo: { equals: clave, mode: "insensitive" } },
      select: {
        id: true,
        correo: true,
        activo: true,
        verificadoAt: true,
        cliente: { select: { nombre: true, contacto: true, estado: true } },
      },
    }),
  ]);

  if (usuario && usuario.activo) {
    return {
      tipo: "usuario",
      id: usuario.id,
      nombre: usuario.nombre || "usuario",
      correo: normalizarCorreo(usuario.correo),
      verificadoAt: usuario.verificadoAt,
    };
  }

  if (cliente && cliente.activo && cliente.cliente?.estado !== "inactivo") {
    return {
      tipo: "cliente",
      id: cliente.id,
      nombre: cliente.cliente.contacto || cliente.cliente.nombre || "cliente",
      correo: normalizarCorreo(cliente.correo),
      verificadoAt: cliente.verificadoAt,
    };
  }

  return null;
}

/**
 * Guarda la nueva contraseña. En trabajadores además cierra todas las sesiones
 * abiertas y limpia contadores de bloqueo. Demostrar control del correo
 * también cuenta como verificación.
 */
export async function cambiarPasswordCuenta(cuenta, password) {
  const passwordHash = hashPassword(password);
  const verificadoAt = cuenta.verificadoAt || new Date();

  if (cuenta.tipo === "usuario") {
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: cuenta.id },
        data: { passwordHash, verificadoAt, intentosFallidos: 0, bloqueadoHasta: null },
      }),
      prisma.sesionUsuario.updateMany({
        where: { usuarioId: cuenta.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return;
  }

  await prisma.clienteCuenta.update({
    where: { id: cuenta.id },
    data: { passwordHash, verificadoAt },
  });
}

/** Marca la cuenta como verificada (código confirmado). */
export async function marcarCuentaVerificada(cuenta) {
  if (cuenta.verificadoAt) return;
  if (cuenta.tipo === "usuario") {
    await prisma.usuario.update({ where: { id: cuenta.id }, data: { verificadoAt: new Date() } });
    return;
  }
  await prisma.clienteCuenta.update({ where: { id: cuenta.id }, data: { verificadoAt: new Date() } });
}

/**
 * Genera y envía el código de recuperación (30 minutos).
 * Devuelve { enviado, modo } — el código nunca se devuelve al cliente HTTP.
 */
export async function enviarCodigoRecuperacion(cuenta, { ip = null } = {}) {
  const { codigo } = await crearTokenAcceso({
    correo: cuenta.correo,
    tipo: "recuperacion",
    ttlMinutes: 30,
    ip,
  });
  const plantilla = emailRecuperacion({ nombre: cuenta.nombre, codigo });
  return sendEmail({ to: cuenta.correo, ...plantilla, tag: "recuperacion" });
}

/**
 * Genera y envía el código de verificación de correo (24 horas).
 * No regenera si la cuenta ya está verificada.
 */
export async function enviarCodigoVerificacion(cuenta, { ip = null } = {}) {
  if (cuenta.verificadoAt) return { enviado: false, modo: "ya-verificada" };
  const { codigo } = await crearTokenAcceso({
    correo: cuenta.correo,
    tipo: "verificacion",
    ttlMinutes: 24 * 60,
    ip,
  });
  const plantilla = emailVerificacion({ nombre: cuenta.nombre, codigo });
  return sendEmail({ to: cuenta.correo, ...plantilla, tag: "verificacion" });
}
