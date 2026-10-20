import { hashPassword } from "./auth";

export function newUserId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseAcceso(body) {
  const errors = [];
  const raw = body ?? {};
  const accesoPanel =
    raw.accesoPanel === true ||
    raw.accesoPanel === "true" ||
    raw.accesoPanel === "on" ||
    raw.accesoPanel === 1;

  const password = typeof raw.password === "string" ? raw.password : "";
  if (accesoPanel && password.length > 0 && password.length < 6) {
    errors.push("La contraseña debe tener al menos 6 caracteres.");
  }

  return { accesoPanel, password, errors };
}

export async function syncUsuario(prisma, trabajador, { accesoPanel, password }) {
  const correo = trabajador.correo;
  const existente = await prisma.usuario.findUnique({ where: { correo } });

  if (!accesoPanel) {
    if (existente) {
      await prisma.usuario.delete({ where: { correo } });
    }
    return null;
  }

  const passwordHash = password.trim() ? hashPassword(password) : null;

  if (existente) {
    const data = {
      nombre: trabajador.nombre,
      rol: trabajador.rol,
      sucursalId: trabajador.sucursalId ?? null,
    };
    if (passwordHash) data.passwordHash = passwordHash;
    return prisma.usuario.update({ where: { correo }, data });
  }

  if (!passwordHash) {
    const error = new Error("Para dar acceso al panel necesitás una contraseña.");
    error.code = "PASSWORD_REQUIRED";
    throw error;
  }

  return prisma.usuario.create({
    data: {
      id: newUserId(),
      nombre: trabajador.nombre,
      correo,
      passwordHash,
      rol: trabajador.rol,
      sucursalId: trabajador.sucursalId ?? null,
      activo: true,
    },
  });
}
