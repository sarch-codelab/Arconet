import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { balanceVentas } from '@/lib/ventas';
import { canReadProductCost } from '@/lib/permisos';
import { csvResponse, xlsxResponse } from '@/lib/export';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function parseRango(searchParams) {
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const where = {};
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }
  return { desde, hasta, where };
}

/**
 * Reportes:
 *   ?reporte=ventas    → ventas por día/estado (reconciliado contra pagos)
 *   ?reporte=pagos     → detalle de pagos cobrados
 *   ?reporte=cobranza  → saldos por orden (facturado vs cobrado)
 *   ?reporte=inventario→ stock y valorización
 *   ?formato=csv|xlsx  → exportación en lugar de JSON
 */
export async function GET(request) {
  const guard = await requirePermission("reportes:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const reporte = searchParams.get("reporte") || "ventas";
  const formato = searchParams.get("formato");
  const { desde, hasta, where } = parseRango(searchParams);
  // Reportes globales no equivale a leer cualquier área. Mantener el mismo
  // límite de módulos y costos que el resumen y el catálogo autenticado.
  if ((["ventas", "pagos"].includes(reporte) && !guard.permisos?.includes("ordenes:read")) ||
      (reporte === "inventario" && !guard.permisos?.includes("inventario:read"))) {
    return Response.json({ error: "No autorizado para consultar el área de este reporte." }, { status: 403 });
  }

  try {
    if (reporte === "ventas") {
      const ordenes = await prisma.orden.findMany({
        where: { tipo: "venta", ...where },
        orderBy: { fecha: "asc" },
        select: {
          id: true, fecha: true, estado: true, monto: true, descuento: true, cliente: { select: { nombre: true } },
        },
      });
      const pagos = await prisma.pago.findMany({
        where: { estado: "confirmado", ...(desde || hasta ? { fecha: where.fecha } : {}) },
        select: { ordenId: true, monto: true },
      });
      const cobradoPorOrden = new Map();
      for (const pago of pagos) {
        cobradoPorOrden.set(pago.ordenId, (cobradoPorOrden.get(pago.ordenId) ?? 0) + Number(pago.monto));
      }
      const filas = ordenes.map((orden) => {
        const cobrado = cobradoPorOrden.get(orden.id) ?? 0;
        const total = Number(orden.monto) - Number(orden.descuento || 0);
        return {
          id: orden.id,
          fecha: orden.fecha,
          cliente: orden.cliente?.nombre || "",
          estado: orden.estado,
          total,
          cobrado,
          saldo: Math.max(0, total - cobrado),
        };
      });
      if (formato) {
        const headers = ["Orden", "Fecha", "Cliente", "Estado", "Total", "Cobrado", "Saldo"];
        const rows = filas.map((f) => [f.id, new Date(f.fecha), f.cliente, f.estado, f.total, f.cobrado, f.saldo]);
        if (formato === "csv") return csvResponse(`ventas-${stamp()}.csv`, headers, rows);
        return xlsxResponse(`ventas-${stamp()}.xls`, "Ventas", headers, rows);
      }
      const balance = await balanceVentas();
      return Response.json({ desde, hasta, balance, filas });
    }

    if (reporte === "pagos") {
      const pagos = await prisma.pago.findMany({
        where: { estado: "confirmado", ...(desde || hasta ? { fecha: where.fecha } : {}) },
        orderBy: { fecha: "asc" },
        include: { orden: { select: { id: true, tipo: true, cliente: { select: { nombre: true } } } } },
      });
      const filas = pagos.map((pago) => ({
        fecha: pago.fecha,
        ordenId: pago.ordenId,
        cliente: pago.orden?.cliente?.nombre || "",
        metodo: pago.metodo,
        referencia: pago.referencia || "",
        monto: Number(pago.monto),
        registradoPor: pago.registradoPor || "",
      }));
      if (formato) {
        const headers = ["Fecha", "Orden", "Cliente", "Método", "Referencia", "Monto", "Registrado por"];
        const rows = filas.map((f) => [new Date(f.fecha), f.ordenId, f.cliente, f.metodo, f.referencia, f.monto, f.registradoPor]);
        if (formato === "csv") return csvResponse(`pagos-${stamp()}.csv`, headers, rows);
        return xlsxResponse(`pagos-${stamp()}.xls`, "Pagos", headers, rows);
      }
      const totalCobrado = filas.reduce((sum, f) => sum + f.monto, 0);
      return Response.json({ desde, hasta, totalCobrado, filas });
    }

    if (reporte === "inventario") {
      const canReadCost = canReadProductCost(guard.permisos);
      const canReadPrice = guard.permisos?.includes("productos:read") || guard.permisos?.includes("precios:read");
      const productos = await prisma.producto.findMany({
        where: { estado: { not: "inactivo" } },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, sku: true, unidad: true, stock: true, stockMinimo: true, costo: canReadCost, precio: Boolean(canReadPrice) },
      });
      const filas = productos.map((p) => ({
        id: p.id, nombre: p.nombre, sku: p.sku, unidad: p.unidad, stock: p.stock, stockMinimo: p.stockMinimo,
        ...(canReadPrice ? { precio: Number(p.precio) } : {}),
        ...(canReadCost ? { costo: Number(p.costo ?? 0), valorizado: p.stock * Number(p.costo ?? 0) } : {}),
        alerta: p.stock <= p.stockMinimo && p.stockMinimo > 0,
      }));
      if (formato) {
        const headers = ["SKU", "Producto", "Unidad", "Stock", "Mínimo", ...(canReadCost ? ["Costo", "Valorizado"] : []), "Alerta"];
        const rows = filas.map((f) => [f.sku, f.nombre, f.unidad, f.stock, f.stockMinimo, ...(canReadCost ? [f.costo, f.valorizado] : []), f.alerta ? "Sí" : "No"]);
        if (formato === "csv") return csvResponse(`inventario-${stamp()}.csv`, headers, rows);
        return xlsxResponse(`inventario-${stamp()}.xls`, "Inventario", headers, rows);
      }
      const enAlerta = filas.filter((f) => f.alerta).length;
      return Response.json({ ...(canReadCost ? { valorizado: filas.reduce((sum, f) => sum + f.valorizado, 0) } : {}), enAlerta, total: filas.length, filas });
    }

    return Response.json({ error: "Reporte desconocido. Usá: ventas, pagos, inventario." }, { status: 400 });
  } catch (error) {
    console.error("GET /api/reportes", error?.message);
    return Response.json({ error: "No se pudo generar el reporte." }, { status: 500 });
  }
}
