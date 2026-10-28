import { prisma } from '@/lib/prisma';
import { parseEntrega, registrarEvento } from '@/lib/ventas';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  const { id, entregaId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseEntrega(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const entrega = await prisma.$transaction(async (tx) => {
      const actual = await tx.entrega.findUnique({ where: { id: entregaId } });
      if (!actual || actual.ordenId !== id) {
        const error = new Error("Entrega no encontrada.");
        error.status = 404;
        throw error;
      }
      const actualizada = await tx.entrega.update({
        where: { id: entregaId },
        data: {
          ...data,
          ...(data.estado === "entregada" && !actual.fechaReal ? { fechaReal: new Date() } : {}),
        },
      });
      if (data.estado && data.estado !== actual.estado) {
        await registrarEvento(tx, id, {
          tipo: "entrega",
          de: actual.estado,
          a: actualizada.estado,
          mensaje: actualizada.guia ? `Guía ${actualizada.guia}` : null,
          actor: guard.session.correo,
        });
      }
      return actualizada;
    });

    await writeLog("panel", `Entrega ${entrega.estado} en orden ${id}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/entregas/${entregaId}`,
    });
    return Response.json(entrega);
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") return Response.json({ error: "Entrega no encontrada." }, { status: 404 });
    console.error("PATCH /api/ordenes/[id]/entregas/[entregaId]", error);
    return Response.json({ error: "No se pudo actualizar la entrega." }, { status: 500 });
  }
}
