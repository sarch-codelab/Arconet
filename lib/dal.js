import { getSession } from "./session";
import { prisma } from "./prisma";
import { ALL_PERMISSIONS, SUPER_ROLE } from "./permisos";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    };
  }
  return { session, response: null };
}

/**
 * Permisos efectivos de la sesión. Se leen de la base de datos en cada
 * petición para que los cambios en un rol apliquen sin volver a iniciar sesión.
 * Un rol inactivo o inexistente no concede permisos.
 */
export async function getPermisos(session) {
  if (!session?.rol) return [];
  if (session.rol === SUPER_ROLE) return ALL_PERMISSIONS;
  const rol = await prisma.rol.findUnique({
    where: { slug: session.rol },
    select: { permisos: true, estado: true },
  });
  if (!rol || rol.estado !== "activo") return [];
  return rol.permisos;
}

export async function requirePermission(permiso) {
  const { session, response } = await requireSession();
  if (response) return { session: null, permisos: [], response };
  const permisos = await getPermisos(session);
  if (!permisos.includes(permiso)) {
    return {
      session: null,
      permisos,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    };
  }
  return { session, permisos, response: null };
}
