import { prisma } from '@/lib/prisma';
import { parseDevolucion, registrarEvento } from '@/lib/ventas';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.orden.findUnique({ where: { id }, select: { id: true } });
    if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const devoluciones = await prisma.devolucion.findMany({
      where: { ordenId: id },
      include: { items: true },
      orderBy: { fecha: "desc" },
    });
    return Response.json(devoluciones);
  } catch (error) {
    console.error("GET /api/ordenes/[id]/devoluciones", error?.message);
    return Response.json({ error: "No se pudieron obtener las devoluciones." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseDevolucion(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const devolucion = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findUnique({ where: { id }, select: { id: true, estado: true } });
      if (!orden) {
        const error = new Error("Orden no encontrada.");
        error.status = 404;
        throw error;
      }
      if (["cancelada", "rechazada"].includes(orden.estado)) {
        const error = new Error("No se registran devoluciones sobre una orden cancelada o rechazada.");
        error.status = 409;
        throw error;
      }
      const { items, ...devolucionData } = data;
      const creada = await tx.devolucion.create({
        data: {
          ...devolucionData,
          ordenId: id,
          registradoPor: guard.session.correo,
          items: items?.length
            ? { create: items.map((item) => ({ ordenItemId: item.ordenItemId, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio })) }
            : undefined,
        },
        include: { items: true },
      });
      await registrarEvento(tx, id, {
        tipo: "devolucion",
        a: creada.estado,
        mensaje: `Devolución de L ${Number(creada.monto).toFixed(2)}: ${creada.motivo}`,
        actor: guard.session.correo,
      });
      return creada;
    });

    await writeLog("panel", `Devolución registrada en orden ${id}`, {
      nivel: "warn",
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/devoluciones`,
      detalle: { devolucionId: devolucion.id, monto: devolucion.monto },
    });
    return Response.json(devolucion, { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/ordenes/[id]/devoluciones", error);
    return Response.json({ error: "No se pudo registrar la devolución." }, { status: 500 });
  }
}
