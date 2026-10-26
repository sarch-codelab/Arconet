import { prisma } from "../../../../../../lib/prisma";
import { ESTADOS_DEVOLUCION, registrarEvento } from "../../../../../../lib/ventas";
import { aplicarMovimiento } from "../../../../../../lib/inventario";
import { requirePermission } from "../../../../../../lib/dal";
import { writeLog } from "../../../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolución de una devolución.
 * - Aceptar: devuelve el stock a la bodega indicada (kardex tipo `devolucion`).
 * - Rechazar: cierra la devolución sin efectos en inventario.
 * Body: { estado, bodegaId?, notas? }
 */
export async function PATCH(request, { params }) {
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  const { id, devolucionId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const estado = typeof body?.estado === "string" ? body.estado.trim() : "";
  if (!ESTADOS_DEVOLUCION.includes(estado)) {
    return Response.json({ error: `Estado inválido. Usá: ${ESTADOS_DEVOLUCION.join(", ")}.` }, { status: 400 });
  }
  const notas = typeof body?.notas === "string" ? body.notas.trim().slice(0, 500) : null;

  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        const devolucion = await tx.devolucion.findUnique({
          where: { id: devolucionId },
          include: { items: true },
        });
        if (!devolucion || devolucion.ordenId !== id) {
          const error = new Error("Devolución no encontrada.");
          error.status = 404;
          throw error;
        }
        if (devolucion.estado !== "pendiente") {
          const error = new Error(`La devolución ya fue resuelta (${devolucion.estado}).`);
          error.status = 409;
          throw error;
        }

        // Aceptar/reembolsar devuelve mercadería al inventario vía kardex.
        if (["aceptada", "reembolsada"].includes(estado)) {
          const bodegaId = typeof body?.bodegaId === "string" ? body.bodegaId : null;
          let destino = bodegaId;
          if (!destino) {
            const bodegas = await tx.bodega.findMany({
              where: { estado: "activo" },
              orderBy: { esPrincipal: "desc" },
            });
            destino = bodegas[0]?.id ?? null;
          }
          if (!destino) {
            const error = new Error("No hay una bodega destino para la devolución de mercadería.");
            error.status = 400;
            throw error;
          }
          for (const item of devolucion.items) {
            if (!item.ordenItemId) continue; // Devoluciones de ítems sin producto no afectan kardex
            const ordenItem = await tx.ordenItem.findUnique({
              where: { id: item.ordenItemId },
              select: { productoId: true },
            });
            if (!ordenItem?.productoId) continue;
            await aplicarMovimiento(tx, {
              tipo: "devolucion",
              productoId: ordenItem.productoId,
              bodegaId: destino,
              cantidad: item.cantidad,
              costoUnitario: Number(item.precio),
              referencia: `devolucion:${devolucion.id}`,
              motivo: `Devolución aceptada de orden ${id}${notas ? ` · ${notas}` : ""}`,
              actor: guard.session.correo,
              ordenId: id,
            });
          }
        }

        const actualizada = await tx.devolucion.update({
          where: { id: devolucionId },
          data: { estado, notas },
        });
        await registrarEvento(tx, id, {
          tipo: "devolucion",
          de: devolucion.estado,
          a: estado,
          mensaje: notas,
          actor: guard.session.correo,
        });
        return actualizada;
      },
      { timeout: 20_000 }
    );

    await writeLog("panel", `Devolución ${resultado.estado} en orden ${id}`, {
      nivel: resultado.estado === "rechazada" ? "warn" : "info",
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/devoluciones/${devolucionId}`,
    });
    return Response.json(resultado);
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") return Response.json({ error: "Devolución no encontrada." }, { status: 404 });
    console.error("PATCH /api/ordenes/[id]/devoluciones/[devolucionId]", error);
    return Response.json({ error: "No se pudo resolver la devolución." }, { status: 500 });
  }
}
