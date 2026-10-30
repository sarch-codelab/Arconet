import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const params = new URL(request.url).searchParams,
    id = params.get("id")?.slice(0, 100),
    q = params.get("q")?.trim().slice(0, 100) || "";
  try {
    const rows = await prisma.proveedor.findMany({
      where: id
        ? { id }
        : {
            estado: "activo",
            ...(q
              ? {
                  OR: ["nombre", "rtn", "contacto"].map((key) => ({
                    [key]: { contains: q, mode: "insensitive" },
                  })),
                }
              : {}),
          },
      orderBy: { nombre: "asc" },
      take: 13,
      select: {
        id: true,
        nombre: true,
        rtn: true,
        contacto: true,
        telefono: true,
        email: true,
        estado: true,
      },
    });
    return Response.json(
      { items: rows.slice(0, 12), hasMore: rows.length > 12 },
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie, x-arconet-preview-session",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "No se pudo buscar proveedores." },
      { status: 503 },
    );
  }
}
