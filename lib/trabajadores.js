export const WORKER_ROLES = ["administrador", "gerente", "tecnico", "ventas", "bodega"];
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

  if (!partial || has("rol")) {
    const rol = text(body?.rol) || "tecnico";
    if (!WORKER_ROLES.includes(rol)) {
      errors.push(`Rol inválido. Usá: ${WORKER_ROLES.join(", ")}.`);
    } else {
      data.rol = rol;
    }
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
