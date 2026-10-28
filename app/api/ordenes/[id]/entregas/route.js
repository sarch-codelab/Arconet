import { prisma } from '@/lib/prisma';
import { parseEntrega, registrarEvento } from '@/lib/ventas';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const entregas = await prisma.entrega.findMany({
      where: { ordenId: id },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(entregas);
  } catch (error) {
    console.error("GET /api/ordenes/[id]/entregas", error?.message);
    return Response.json({ error: "No se pudieron obtener las entregas." }, { status: 500 });
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

  const { data, errors } = parseEntrega(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const entrega = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findUnique({ where: { id }, select: { id: true, estado: true } });
      if (!orden) {
        const error = new Error("Orden no encontrada.");
        error.status = 404;
        throw error;
      }
      if (["cancelada", "rechazada"].includes(orden.estado)) {
        const error = new Error("No se programan entregas sobre una orden cancelada o rechazada.");
        error.status = 409;
        throw error;
      }
      const creada = await tx.entrega.create({
        data: { ...data, ordenId: id, registradoPor: guard.session.correo },
      });
      await registrarEvento(tx, id, {
        tipo: "entrega",
        a: creada.estado,
        mensaje: `${creada.tipo === "despacho" ? "Despacho" : "Entrega"} programada${creada.fechaProgramada ? ` para ${creada.fechaProgramada.toISOString().slice(0, 10)}` : ""}`,
        actor: guard.session.correo,
      });
      return creada;
    });

    await writeLog("panel", `Entrega creada para orden ${id}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/entregas`,
      detalle: { entregaId: entrega.id },
    });
    return Response.json(entrega, { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/ordenes/[id]/entregas", error);
    return Response.json({ error: "No se pudo crear la entrega." }, { status: 500 });
  }
}
