import { requirePermission, getPermisos } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  const permissions = await getPermisos(guard.session);
  try {
    const [products, warehouses, movements, pending] = await Promise.all([
      prisma.producto.findMany({
        where: { archivado: false, estado: "activo" },
        select: { stock: true, stockMinimo: true, unidad: true },
      }),
      prisma.bodega.count({ where: { estado: "activo" } }),
      prisma.movimientoKardex.findMany({
        orderBy: { fecha: "desc" },
        take: 8,
        select: {
          id: true,
          fecha: true,
          tipo: true,
          cantidad: true,
          producto: { select: { nombre: true, sku: true, unidad: true } },
          bodega: { select: { nombre: true } },
        },
      }),
      permissions.includes("compras:receive") ||
      permissions.includes("compras:read")
        ? prisma.ordenCompra.count({
            where: { tipo: "compra", estado: { in: ["enviada", "parcial"] } },
          })
        : null,
    ]);
    const units = {};
    for (const product of products)
      units[product.unidad] = (units[product.unidad] || 0) + product.stock;
    return Response.json(
      {
        productos: products.length,
        agotados: products.filter((p) => p.stock === 0).length,
        bajoMinimo: products.filter(
          (p) => p.stock > 0 && p.stockMinimo > 0 && p.stock <= p.stockMinimo,
        ).length,
        bodegas: warehouses,
        unidadesPorUnidad: units,
        recepcionesPendientes: pending,
        movimientos: movements,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudo cargar el resumen de inventario." },
      { status: 503 },
    );
  }
}
