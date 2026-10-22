export const ROLE_STATUSES = ["activo", "inactivo"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function newRolId() {
  return `rol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseRol(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre del rol es obligatorio.");
    else data.nombre = nombre;
  }

  if (has("slug")) {
    const slug = slugify(body.slug);
    if (!slug) errors.push("El slug del rol es obligatorio.");
    else data.slug = slug;
  } else if (!partial && data.nombre) {
    const slug = slugify(data.nombre);
    if (!slug) errors.push("No se pudo generar el slug del rol.");
    else data.slug = slug;
  }

  if (has("descripcion")) {
    data.descripcion = text(body.descripcion) || null;
  }

  if (has("permisos")) {
    if (Array.isArray(body.permisos)) {
      data.permisos = body.permisos.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim());
    } else if (body.permisos === null || body.permisos === "") {
      data.permisos = [];
    } else {
      errors.push("Los permisos deben ser un array de strings.");
    }
  }

  if (has("estado")) {
    const estado = text(body.estado) || "activo";
    if (!ROLE_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usa: ${ROLE_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  return { data, errors };
}