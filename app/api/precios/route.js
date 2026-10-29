import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { toPrecio } from "@/lib/serialize";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const guard = await requirePermission("precios:read");
  if (guard.response) return guard.response;
  const q =
    new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  try {
    const products = await prisma.producto.findMany({
      where: {
        archivado: false,
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: 500,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        sku: true,
        categoria: true,
        estado: true,
        precio: true,
        precioDescuento: true,
        precioMayorista: true,
        preciosUpdatedAt: true,
        preciosUpdatedBy: true,
      },
    });
    return Response.json(products.map(toPrecio), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "No se pudieron cargar los precios." },
      { status: 500 },
    );
  }
}
