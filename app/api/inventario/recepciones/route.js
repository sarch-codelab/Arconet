import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SELECT_RECEIVING, receivingDTO } from "@/lib/compras-dto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const guard = await requirePermission("compras:receive");
  if (guard.response) return guard.response;
  const inventory = await requirePermission("inventario:read");
  if (inventory.response) return inventory.response;
  try {
    const rows = await prisma.ordenCompra.findMany({
      where: {
        tipo: "compra",
        estado: { in: ["enviada", "parcial", "recibida"] },
      },
      orderBy: { fecha: "desc" },
      take: 200,
      select: SELECT_RECEIVING,
    });
    return Response.json(rows.map(receivingDTO), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "No se pudieron cargar las recepciones." },
      { status: 503 },
    );
  }
}
