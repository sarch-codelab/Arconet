import { prisma } from "../../../../lib/prisma";
import { requireClientSession } from "../../../../lib/portal-cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Documentos disponibles para el cliente: cotizaciones y facturas (ventas)
 * ya emitidas, generadas on-demand por /api/cliente-portal/documentos/[id].
 */
export async function GET() {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const ordenes = await prisma.orden.findMany({
      where: {
        clienteId: session.clienteId,
        estado: { notIn: ["pendiente", "rechazada", "vencida"] },
      },
      orderBy: { fecha: "desc" },
      take: 100,
      select: { id: true, tipo: true, fecha: true, monto: true, estado: true },
    });
    const documentos = ordenes.map((orden) => ({
      id: orden.id,
      tipo: orden.tipo === "venta" ? "factura" : "cotizacion",
      nombre: `${orden.tipo === "venta" ? "Factura" : "Cotización"} ${orden.id}`,
      fecha: orden.fecha.toISOString(),
      monto: Number(orden.monto),
      estado: orden.estado,
      url: `/api/cliente-portal/documentos/${orden.id}`,
    }));
    return Response.json(documentos);
  } catch (error) {
    console.error("GET /api/cliente-portal/documentos", error?.message);
    return Response.json({ error: "No se pudieron cargar los documentos." }, { status: 503 });
  }
}
