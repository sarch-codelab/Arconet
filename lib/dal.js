import { getSession } from "./session";

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

export const ROLES_ADMIN = ["administrador"];
export const ROLES_GESTION = ["administrador", "gerente"];

export function hasRole(session, roles) {
  return Boolean(session?.rol && roles.includes(session.rol));
}

export async function requireRole(roles) {
  const { session, response } = await requireSession();
  if (response) return { session: null, response };
  if (!hasRole(session, roles)) {
    return {
      session: null,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    };
  }
  return { session, response: null };
}
