export const PRODUCT_UNITS = ["Unidad", "Pieza", "Par", "Metro", "Rollo", "Caja"];
export const PRODUCT_STATUSES = ["activo", "borrador", "inactivo"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
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

  if (has("codigoBarras")) {
    // Se aceptan solo dígitos y los separadores habituales; los lectores
    // suelen devolver el código limpio, pero al teclearlo se cuelan espacios.
    const codigo = text(body.codigoBarras).replace(/[\s-]/g, "");
    if (!codigo) {
      data.codigoBarras = null;
    } else if (!/^[0-9A-Za-z._-]{4,64}$/.test(codigo)) {
      errors.push("El código de barras debe tener entre 4 y 64 caracteres alfanuméricos.");
    } else {
      data.codigoBarras = codigo;
    }
  }

  if (has("descripcion")) {
    data.descripcion = text(body.descripcion) || null;
  }

  if (has("ubicacion")) {
    data.ubicacion = text(body.ubicacion) || null;
  }

  if (has("costo")) {
    const raw = body.costo;
    if (raw === null || raw === "" || raw === undefined) {
      data.costo = null;
    } else {
      const costo = number(raw);
      if (costo === null || costo < 0) errors.push("El costo debe ser un número mayor o igual a 0.");
      else data.costo = costo;
    }
  }

  if (has("peso")) {
    const raw = body.peso;
    if (raw === null || raw === "" || raw === undefined) {
      data.peso = null;
    } else {
      const peso = number(raw);
      if (peso === null || peso < 0) errors.push("El peso debe ser un número mayor o igual a 0.");
      else data.peso = peso;
    }
  }

  if (has("stockMinimo")) {
    const stockMinimo = number(body.stockMinimo);
    if (stockMinimo === null || !Number.isInteger(stockMinimo) || stockMinimo < 0) {
      errors.push("El stock mínimo debe ser un entero mayor o igual a 0.");
    } else {
      data.stockMinimo = stockMinimo;
    }
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
    // Un precio de 0 convertiría la venta en un regalo; el mínimo es 1.
    if (precio === null || !Number.isFinite(precio) || precio < 1) {
      errors.push("El precio debe ser un número mayor o igual a 1.00 (no se permiten productos gratis).");
    } else {
      data.precio = precio;
    }
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

  if (has("fotos")) {
    const fotos = body.fotos;
    if (Array.isArray(fotos)) {
      const validFotos = [];
      for (const foto of fotos) {
        if (typeof foto === "string" && foto.trim()) {
          if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(foto) && foto.length <= 200000) {
            validFotos.push(foto);
          } else if (foto.startsWith("/") || /^https?:\/\//i.test(foto)) {
            // Rutas relativas o URLs externas
            validFotos.push(foto);
          } else {
            errors.push(`Imagen de galería inválida: debe ser base64 <200KB, ruta /... o URL http(s)://`);
            break;
          }
        }
      }
      data.fotos = validFotos;
    } else if (fotos === null || fotos === "") {
      data.fotos = [];
    } else {
      errors.push("Las fotos de galería deben ser un array de strings.");
    }
  }

  return { data, errors };
}
