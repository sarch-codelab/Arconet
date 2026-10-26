// Servicio de inventario: kardex (movimientos con historial), stock por
// bodega, transferencias, ajustes y alertas de reabastecimiento.
import { prisma } from "./prisma";

// Todas las escrituras pasan por aplicarMovimiento(), que mantiene:
//   - ProductoStock (existencias por bodega)
//   - Producto.stock (suma de todas las bodegas, para el catálogo)
//   - Producto.costo (último costo de entrada)
//   - MovimientoKardex (historial inmutable con saldo anterior/después)

export const TIPOS_MOVIMIENTO = ["entrada", "salida", "ajuste", "transferencia", "devolucion"];
export const ESTADOS_BODEGA = ["activo", "inactivo"];

function text(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function int(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function newBodegaCodigo(nombre) {
  const base = text(nombre, 40)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12) || "BOD";
  return `BOD-${base}`;
}

export function parseBodega(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre, 80);
    if (!nombre) errors.push("El nombre de la bodega es obligatorio.");
    else data.nombre = nombre;
  }
  if (has("codigo")) data.codigo = text(body?.codigo, 30) || null;
  if (has("sucursalId")) data.sucursalId = text(body?.sucursalId, 60) || null;
  if (has("direccion")) data.direccion = text(body?.direccion, 200) || null;
  if (has("esPrincipal")) data.esPrincipal = Boolean(body?.esPrincipal);
  if (has("estado")) {
    const estado = text(body?.estado) || "activo";
    if (!ESTADOS_BODEGA.includes(estado)) errors.push("Estado de bodega inválido.");
    else data.estado = estado;
  }
  return { data, errors };
}

export function parseProveedor(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("nombre")) {
    const nombre = text(body?.nombre, 120);
    if (!nombre) errors.push("El nombre del proveedor es obligatorio.");
    else data.nombre = nombre;
  }
  if (has("rtn")) data.rtn = text(body?.rtn, 30) || null;
  if (has("contacto")) data.contacto = text(body?.contacto, 120) || null;
  if (has("telefono")) data.telefono = text(body?.telefono, 40) || null;
  if (has("email")) data.email = text(body?.email, 120) || null;
  if (has("direccion")) data.direccion = text(body?.direccion, 200) || null;
  if (has("notas")) data.notas = text(body?.notas, 1000) || null;
  if (has("estado")) {
    const estado = text(body?.estado) || "activo";
    if (!["activo", "inactivo"].includes(estado)) errors.push("Estado de proveedor inválido.");
    else data.estado = estado;
  }
  return { data, errors };
}

export function parseMovimiento(body) {
  const errors = [];
  const data = {};

  const tipo = text(body?.tipo);
  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    errors.push(`Tipo de movimiento inválido. Usá: ${TIPOS_MOVIMIENTO.join(", ")}.`);
  } else data.tipo = tipo;

  const productoId = text(body?.productoId, 60);
  if (!productoId) errors.push("El producto es obligatorio.");
  else data.productoId = productoId;

  const bodegaId = text(body?.bodegaId, 60);
  if (!bodegaId) errors.push("La bodega es obligatoria.");
  else data.bodegaId = bodegaId;

  const cantidad = int(body?.cantidad);
  if (cantidad === null || cantidad === 0) {
    errors.push("La cantidad debe ser un entero distinto de cero.");
  } else if (tipo !== "ajuste" && cantidad < 0) {
    errors.push("La cantidad debe ser positiva (el ajuste admite signo).");
  } else data.cantidad = cantidad;

  if (tipo === "transferencia") {
    const destino = text(body?.bodegaDestinoId, 60);
    if (!destino) errors.push("La transferencia necesita bodega destino.");
    else if (destino === bodegaId)    errors.push("La bodega destino debe ser distinta de la origen.");
    else data.bodegaDestinoId = destino;
  }

  if (body?.costoUnitario != null && body?.costoUnitario !== "") {
    const costo = Number(body.costoUnitario);
    if (!Number.isFinite(costo) || costo < 0) errors.push("El costo unitario no es válido.");
    else data.costoUnitario = costo;
  }

  data.referencia = text(body?.referencia, 80) || null;
  data.motivo = text(body?.motivo, 500) || null;
  return { data, errors };
}

async function saldoEn(tx, productoId, bodegaId) {
  const row = await tx.productoStock.findUnique({
    where: { productoId_bodegaId: { productoId, bodegaId } },
    select: { cantidad: true },
  });
  return row?.cantidad ?? 0;
}

async function refrescarTotalProducto(tx, productoId) {
  const agg = await tx.productoStock.aggregate({
    where: { productoId },
    _sum: { cantidad: true },
  });
  const total = agg._sum.cantidad ?? 0;
  await tx.producto.update({ where: { id: productoId }, data: { stock: total } });
  return total;
}

async function registrarMovimiento(tx, input) {
  const producto = await tx.producto.findUnique({
    where: { id: input.productoId },
    select: { id: true, costo: true, stockMinimo: true, nombre: true },
  });
  if (!producto) {
    const error = new Error("El producto indicado no existe.");
    error.status = 400;
    throw error;
  }

  const saldoAnterior = await saldoEn(tx, input.productoId, input.bodegaId);
  let saldoDespues;
  if (input.tipo === "ajuste") {
    saldoDespues = saldoAnterior + input.cantidad;
  } else if (input.tipo === "salida" || input.tipo === "transferencia") {
    // La transferencia descuenta en la bodega origen; la contraparte
    // (entrada) se registra después en el destino, así que el total de la
    // empresa no cambia.
    saldoDespues = saldoAnterior - Math.abs(input.cantidad);
  } else {
    saldoDespues = saldoAnterior + Math.abs(input.cantidad);
  }
  if (saldoDespues < 0) {
    const error = new Error(
      `Stock insuficiente: la bodega tiene ${saldoAnterior} y el movimiento deja ${saldoDespues}.`
    );
    error.status = 400;
    throw error;
  }

  await tx.productoStock.upsert({
    where: { productoId_bodegaId: { productoId: input.productoId, bodegaId: input.bodegaId } },
    update: { cantidad: saldoDespues },
    create: { productoId: input.productoId, bodegaId: input.bodegaId, cantidad: saldoDespues },
  });

  const movimiento = await tx.movimientoKardex.create({
    data: {
      tipo: input.tipo,
      productoId: input.productoId,
      bodegaId: input.bodegaId,
      bodegaDestinoId: input.bodegaDestinoId ?? null,
      cantidad: input.tipo === "ajuste" ? input.cantidad : Math.abs(input.cantidad),
      saldoAnterior,
      saldoDespues,
      costoUnitario: input.costoUnitario ?? null,
      referencia: input.referencia ?? null,
      motivo: input.motivo ?? null,
      actor: input.actor ?? null,
      ordenCompraId: input.ordenCompraId ?? null,
      ordenId: input.ordenId ?? null,
      fecha: input.fecha ?? new Date(),
    },
  });

  // Último costo de adquisición: toda entrada con costo actualiza el producto.
  if (input.tipo === "entrada" && input.costoUnitario != null) {
    await tx.producto.update({
      where: { id: input.productoId },
      data: { costo: input.costoUnitario },
    });
  }

  await refrescarTotalProducto(tx, input.productoId);
  return movimiento;
}

/**
 * Aplica un movimiento completo (y su contraparte si es transferencia).
 * Debe ejecutarse dentro de prisma.$transaction.
 */
export async function aplicarMovimiento(tx, input) {
  // Lock por producto para serializar escrituras concurrentes del mismo ítem.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inv-${input.productoId}`}))`;

  const principal = await registrarMovimiento(tx, input);

  if (input.tipo === "transferencia") {
    await registrarMovimiento(tx, {
      ...input,
      tipo: "entrada",
      bodegaId: input.bodegaDestinoId,
      bodegaDestinoId: null,
      motivo: input.motivo ? `Transferencia: ${input.motivo}` : "Transferencia entrante",
      referencia: input.referencia,
    });
  }

  return principal;
}

/**
 * Bodega donde se registran las salidas automáticas (ventas, facturas y
 * stock inicial). Si todavía no existe ninguna, se crea la principal.
 * Acepta la transacción en curso para no abrir una conexión aparte.
 */
export async function bodegaPrincipal(tx = prisma) {
  const existente = await tx.bodega.findFirst({
    where: { estado: "activo" },
    orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
  });
  if (existente) return existente;

  try {
    return await tx.bodega.create({
      data: {
        nombre: "Bodega principal",
        codigo: "BOD-PRINCIPAL",
        esPrincipal: true,
        direccion: null,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const otra = await tx.bodega.findUnique({ where: { codigo: "BOD-PRINCIPAL" } });
      if (otra) return otra;
    }
    throw error;
  }
}

/**
 * Carga como saldo inicial el stock que ya tenían los productos antes de
 * existir las bodegas. Solo actúa sobre productos sin filas de stock, así que
 * es seguro ejecutarlo más de una vez. Devuelve cuántos productos ajustó.
 */
export async function sincronizarStockInicial(tx = prisma, { actor = null } = {}) {
  const bodega = await bodegaPrincipal(tx);
  const productos = await tx.producto.findMany({
    where: { stock: { gt: 0 } },
    select: { id: true, stock: true, _count: { select: { stockPorBodega: true } } },
  });

  let ajustados = 0;
  for (const producto of productos) {
    if (producto._count.stockPorBodega > 0) continue;
    await aplicarMovimiento(tx, {
      tipo: "ajuste",
      productoId: producto.id,
      bodegaId: bodega.id,
      cantidad: producto.stock,
      motivo: "Saldo inicial de inventario",
      referencia: "inicial",
      actor,
    });
    ajustados += 1;
  }

  return { bodegaId: bodega.id, bodega: bodega.nombre, ajustados };
}

export async function stockPorBodega({ productoId = null, bodegaId = null } = {}) {
  const where = {};
  if (productoId) where.productoId = productoId;
  if (bodegaId) where.bodegaId = bodegaId;
  const filas = await prisma.productoStock.findMany({
    where,
    include: {
      producto: { select: { id: true, nombre: true, sku: true, unidad: true, stockMinimo: true, costo: true, precio: true, estado: true } },
      bodega: { select: { id: true, nombre: true, codigo: true, sucursalId: true, esPrincipal: true } },
    },
    orderBy: [{ bodegaId: "asc" }],
  });
  return filas;
}

/** Productos cuyo total está en cero o por debajo del mínimo (punto de reorden). */
export async function alertasReabastecimiento() {
  const productos = await prisma.producto.findMany({
    where: { estado: "activo", stockMinimo: { gt: 0 } },
    select: { id: true, nombre: true, sku: true, unidad: true, stock: true, stockMinimo: true, costo: true, precio: true },
    orderBy: { stock: "asc" },
  });
  const enAlerta = productos.filter((p) => p.stock <= p.stockMinimo);
  const agotados = productos.filter((p) => p.stock <= 0);
  return { alertas: enAlerta, agotados, total: productos.length };
}
