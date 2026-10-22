export const CATEGORY_STATUSES = ["activo", "inactivo"];

const MAX_FOTO_LENGTH = 200000;

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

export function newCategoriaId() {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseCategoria(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre de la categoría es obligatorio.");
    else data.nombre = nombre;
  }

  if (has("slug")) {
    const slug = slugify(body.slug);
    if (!slug) errors.push("El slug de la categoría es obligatorio.");
    else data.slug = slug;
  } else if (!partial && data.nombre) {
    const slug = slugify(data.nombre);
    if (!slug) errors.push("No se pudo generar el slug de la categoría.");
    else data.slug = slug;
  }

  if (has("descripcion")) {
    data.descripcion = text(body.descripcion) || null;
  }

  if (has("foto")) {
    const foto = body.foto;
    if (foto == null || foto === "") {
      data.foto = null;
    } else if (
      typeof foto === "string" &&
      (foto.startsWith("/") ||
        /^https?:\/\//i.test(foto) ||
        (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(foto) &&
          foto.length <= MAX_FOTO_LENGTH))
    ) {
      data.foto = foto;
    } else {
      errors.push("Foto inválida: usa una ruta, una URL o una imagen menor a 200KB.");
    }
  }

  if (has("orden")) {
    const orden = Number(body.orden);
    if (!Number.isInteger(orden) || orden < 0) errors.push("El orden debe ser un entero mayor o igual a 0.");
    else data.orden = orden;
  }

  if (has("estado")) {
    const estado = text(body.estado) || "activo";
    if (!CATEGORY_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usa: ${CATEGORY_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  return { data, errors };
}
