export const PRODUCT_UNITS = ["Unidad", "Pieza", "Par", "Metro", "Rollo", "Caja"];
export const PRODUCT_STATUSES = ["activo", "borrador", "inactivo"];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function newProductoId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseProducto(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre);
    if (!nombre) errors.push("El nombre es obligatorio.");
    else data.nombre = nombre;
  }

  if (!partial || has("sku")) {
    const sku = text(body?.sku);
    if (!sku) errors.push("El SKU es obligatorio.");
    else data.sku = sku;
  }

  if (!partial || has("categoria")) {
    const categoria = text(body?.categoria);
    if (!categoria) errors.push("La categoría es obligatoria.");
    else data.categoria = categoria;
  }

  if (has("marca")) {
    data.marca = text(body.marca) || null;
  }

  if (!partial || has("unidad")) {
    const unidad = text(body?.unidad) || "Unidad";
    if (!PRODUCT_UNITS.includes(unidad)) {
      errors.push(`Unidad inválida. Usá: ${PRODUCT_UNITS.join(", ")}.`);
    } else {
      data.unidad = unidad;
    }
  }

  if (!partial || has("precio")) {
    const precio = number(body?.precio);
    if (precio === null || precio < 0) errors.push("El precio debe ser un número mayor o igual a 0.");
    else data.precio = precio;
  }

  if (!partial || has("stock")) {
    const stock = number(body?.stock);
    if (stock === null || !Number.isInteger(stock) || stock < 0) {
      errors.push("El stock debe ser un entero mayor o igual a 0.");
    } else {
      data.stock = stock;
    }
  }

  if (!partial || has("estado")) {
    const estado = text(body?.estado) || "activo";
    if (!PRODUCT_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usá: ${PRODUCT_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  if (has("foto")) {
    data.foto = text(body.foto) || null;
  }

  return { data, errors };
}
