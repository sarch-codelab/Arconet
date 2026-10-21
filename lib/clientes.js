export const CLIENT_STATUSES = ["activo", "inactivo", "prospecto"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
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

  for (const field of ["rtn", "contacto", "correo", "telefono", "direccion", "ciudad"]) {
    if (has(field)) data[field] = text(body[field]) || null;
  }

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
