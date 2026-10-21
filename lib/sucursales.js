export const SUCURSAL_ESTADOS = ["activo", "borrador", "inactivo"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

export function newSucursalId() {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseSucursal(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre es obligatorio.");
    else data.nombre = nombre;
  }

  if (!partial || has("codigo")) {
    const codigo = text(body?.codigo).toUpperCase();
    if (!codigo) errors.push("El código es obligatorio.");
    else data.codigo = codigo;
  }

  if (!partial || has("ciudad")) {
    const ciudad = text(body?.ciudad);
    if (!ciudad) errors.push("La ciudad es obligatoria.");
    else data.ciudad = ciudad;
  }

  for (const field of ["direccion", "telefono", "email", "responsable"]) {
    if (has(field)) data[field] = text(body[field]) || null;
  }

  if (has("estado")) {
    const estado = text(body.estado) || "activo";
    if (!SUCURSAL_ESTADOS.includes(estado)) {
      errors.push(`Estado inválido. Usá: ${SUCURSAL_ESTADOS.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  return { data, errors };
}
