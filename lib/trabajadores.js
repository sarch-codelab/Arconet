import { SUPER_ROLE } from "./permisos";

export const WORKER_STATUSES = ["activo", "vacaciones", "inactivo"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

export function newWorkerId() {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseIngreso(value) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTrabajador(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre es obligatorio.");
    else data.nombre = nombre;
  }

  if (!partial || has("correo")) {
    const correo = text(body?.correo).toLowerCase();
    if (!correo) errors.push("El correo es obligatorio.");
    else data.correo = correo;
  }

  if (has("puesto")) data.puesto = text(body.puesto) || null;
  if (has("telefono")) data.telefono = text(body.telefono) || null;
  if (has("foto")) {
    const foto = body.foto;
    if (foto == null || foto === "") {
      data.foto = null;
    } else if (
      typeof foto === "string" &&
      /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(foto) &&
      foto.length <= 200000
    ) {
      data.foto = foto;
    } else {
      errors.push("Foto inválida: debe ser imagen base64 (png/jpeg/webp/gif) menor a 200KB.");
    }
  }

  if (has("sucursal")) {
    data.sucursalId = text(body.sucursal) || null;
  }

  // Los roles son administrables: la ruta valida que el slug exista y esté activo.
  if (!partial || has("rol")) {
    data.rol = text(body?.rol) || "tecnico";
  }

  if (has("estado")) {
    const estado = text(body.estado) || "activo";
    if (!WORKER_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usá: ${WORKER_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  if (has("ingreso")) data.ingreso = parseIngreso(body.ingreso);

  return { data, errors };
}

/**
 * Valida la asignación de rol de un trabajador. Devuelve un mensaje de error
 * o null. Solo un administrador puede crear, editar o quitar administradores,
 * para que otros roles con permiso sobre el personal no escalen privilegios.
 */
export async function checkRolAsignado(prisma, session, { nuevo, actual }) {
  const esAdmin = session?.rol === SUPER_ROLE;
  if (!esAdmin && (nuevo === SUPER_ROLE || actual === SUPER_ROLE)) {
    return { status: 403, error: "Solo un administrador puede gestionar administradores." };
  }
  if (nuevo && nuevo !== actual) {
    const rol = await prisma.rol.findUnique({ where: { slug: nuevo }, select: { estado: true } });
    if (!rol || rol.estado !== "activo") {
      return { status: 400, error: "Rol inválido: elige un rol activo de la sección Roles." };
    }
  }
  return null;
}
