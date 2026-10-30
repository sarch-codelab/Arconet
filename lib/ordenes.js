import { commercialTotal, checkedCommercialTotal, roundMoney } from "./ventas-form";

export const ORDER_STATUSES = [
  "pendiente",
  "en_proceso",
  "aprobada",
  "rechazada",
  "en_preparacion",
  "despachada",
  "entregada",
  "completada",
  "vencida",
  "cancelada",
];
export const ORDER_TYPES = ["cotizacion", "venta"];

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

function number(value) {
  const parsed = typeof value === "number" || (typeof value === "string" && value.trim()) ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function newOrderId() {
  return `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseFecha(value) {
  const raw = text(value);
  if (!raw) return new Date();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function parseOrden(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("tipo")) {
    const tipo = text(body?.tipo) || "cotizacion";
    if (!ORDER_TYPES.includes(tipo)) {
      errors.push(`Tipo inválido. Usá: ${ORDER_TYPES.join(", ")}.`);
    } else {
      data.tipo = tipo;
    }
  }

  if (!partial || has("clienteId")) {
    const clienteId = text(body?.clienteId);
    if (!clienteId) errors.push("El cliente es obligatorio.");
    else data.clienteId = clienteId;
  }

  if (has("fecha")) data.fecha = parseFecha(body.fecha);

  if (has("monto")) {
    const monto = number(body.monto);
    if (monto === null || monto < 0) errors.push("El monto debe ser mayor o igual a 0.");
    else data.monto = monto;
  }

  if (has("estado")) {
    const estado = text(body.estado) || "pendiente";
    if (!ORDER_STATUSES.includes(estado)) {
      errors.push(`Estado inválido. Usá: ${ORDER_STATUSES.join(", ")}.`);
    } else {
      data.estado = estado;
    }
  }

  if (has("notas")) data.notas = text(body.notas) || null;

  if (!partial && (!Array.isArray(body?.items) || !body.items.length)) {
    errors.push("Añade al menos un producto o concepto con cantidad y precio.");
  }

  if (has("items")) {
    if (!Array.isArray(body.items)) {
      errors.push("Los items deben ser una lista.");
    } else if (body.items.length > 100) {
      errors.push("Demasiados items (máximo 100).");
    } else {
      const items = [];
      for (const raw of body.items) {
        const nombre = text(raw?.nombre);
        const cantidad = number(raw?.cantidad);
        const precio = number(raw?.precio);
        if (!nombre) {
          errors.push("Cada ítem necesita un nombre.");
          break;
        }
        if (cantidad === null || cantidad <= 0 || cantidad > 999999999.999 || Math.abs(cantidad - Math.round(cantidad * 1000) / 1000) > Number.EPSILON * Math.max(1, Math.abs(cantidad)) * 4) {
          errors.push(`Cantidad inválida en "${nombre}".`);
          break;
        }
        if (text(raw?.productoId) && !Number.isInteger(cantidad)) {
          errors.push(`La cantidad de "${nombre}" debe ser entera para llevar el inventario.`);
          break;
        }
        if (precio === null || precio < 0 || precio > 9999999999.99 || Math.abs(precio - roundMoney(precio)) > Number.EPSILON * Math.max(1, Math.abs(precio)) * 4) {
          errors.push(`Precio inválido en "${nombre}".`);
          break;
        }
        if (raw?.nivelPrecio != null && !["normal", "descuento", "mayorista"].includes(raw.nivelPrecio)) {
          errors.push("Tarifa de precio inválida."); break;
        }
        items.push({
          ...(raw?.id ? { itemOriginalId: text(raw.id) } : {}),
          ...(raw?.nivelPrecio ? { nivelPrecio: raw.nivelPrecio } : {}),
          ...(raw?.actualizarPrecio === true ? { actualizarPrecio: true } : {}),
          productoId: text(raw?.productoId) || null,
          nombre,
          cantidad,
          precio,
        });
      }
      if (!errors.length) {
        data.items = items;
        // El monto de un documento con líneas no depende del total enviado
        // por el navegador; editar cantidades también actualiza el total.
        if (items.length) {
          try { data.monto = partial ? commercialTotal(items) : checkedCommercialTotal(items); }
          catch (error) { errors.push(error.message); }
        }
      }
    }
  }

  return { data, errors };
}
