export const CLIENT_STATUSES = ["activo", "inactivo", "prospecto"];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function newClienteId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseFecha(value) {
  const raw = text(value);
  if (!raw) return new Date();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function parseCliente(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre es obligatorio.");
    else data.nombre = nombre;
  }

  for (const field of ["rtn", "contacto", "correo", "telefono", "direccion", "ciudad", "foto"]) {
    if (has(field)) data[field] = text(body[field]) || null;
  }

  if (has("estado")) {
    const estado = text(body.estado) || "activo";
    if (!CLIENT_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usá: ${CLIENT_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  if (has("fechaRegistro")) data.fechaRegistro = parseFecha(body.fechaRegistro);

  return { data, errors };
}
