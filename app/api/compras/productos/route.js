import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const params = new URL(request.url).searchParams,
    id = params.get("id")?.slice(0, 100),
    q = params.get("q")?.trim().slice(0, 100) || "";
  const where = id
    ? { id }
    : {
        archivado: false,
        estado: "activo",
        ...(q
          ? {
              OR: ["nombre", "sku", "codigoBarras"].map((key) => ({
                [key]: { contains: q, mode: "insensitive" },
              })),
            }
          : {}),
      };
  try {
    const items = await prisma.producto.findMany({
      where,
      orderBy: { nombre: "asc" },
      take: 13,
      select: {
        id: true,
        nombre: true,
        sku: true,
        unidad: true,
        costo: true,
        estado: true,
        archivado: true,
      },
    });
    return Response.json(
      {
        items: items
          .slice(0, 12)
          .map((item) => ({
            ...item,
            costo: item.costo == null ? null : Number(item.costo),
          })),
        hasMore: items.length > 12,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie, x-arconet-preview-session",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "No se pudo buscar el catálogo de compras." },
      { status: 503 },
    );
  }
}
