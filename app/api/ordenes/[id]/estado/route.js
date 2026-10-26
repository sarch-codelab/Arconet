import { prisma } from "../../../../../lib/prisma";
import { puedeTransicionar, registrarEvento, ORDER_STATUSES } from "../../../../../lib/ventas";
import { descontarStock, revertirStock } from "../../../../../lib/stock-ventas";
import { requirePermission } from "../../../../../lib/dal";
import { writeLog } from "../../../../../lib/logs";

// Etiqueta legible para avisos al cliente.
const ESTADO_LABEL = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  en_preparacion: "En preparación",
  despachada: "Despachada",
  entregada: "Entregada",
  completada: "Completada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

/**
 * Notifica al portal del cliente (recipient "cliente:<id>") y deja un
 * evento visible en el historial de la orden. Best-effort: nunca rompe
 * la transición si el aviso falla.
 */
async function notificarCliente(tx, orden, estadoNuevo) {
  try {
    if (!orden.clienteId) return;
    const label = ESTADO_LABEL[estadoNuevo] || estadoNuevo;
    await tx.notificacion.create({
      data: {
        recipient: `cliente:${orden.clienteId}`,
        title: `Actualización de tu solicitud ${orden.id}`,
        message: `Tu solicitud cambió de estado a "${label}".`,
        type: "orden",
      },
    });
    await registrarEvento(tx, orden.id, {
      tipo: "nota",
      mensaje: `Se notificó al cliente: estado actual "${label}".`,
      actor: "sistema",
    });
  } catch (error) {
    console.error("notificarCliente", error?.message);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estados en los que una venta ya no sostiene la salida de mercancía: al
// entrar a ellos se devuelve el inventario (y al salir, si fuera posible,
// se vuelve a descontar). Espejo de la lógica de PATCH /api/ordenes/[id].
const ESTADOS_SIN_STOCK = ["cancelada", "rechazada"];

/**
 * Cambia el estado de una orden validando la transición del ciclo
 * cotización → venta → entrega y dejando el rastro en OrdenEvento.
 * Body: { estado, nota? }
 */
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

  const estado = typeof body?.estado === "string" ? body.estado.trim() : "";
  if (!ORDER_STATUSES.includes(estado)) {
    return Response.json({ error: `Estado inválido. Usá: ${ORDER_STATUSES.join(", ")}.` }, { status: 400 });
  }
  const nota = typeof body?.nota === "string" ? body.nota.trim().slice(0, 500) : null;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findUnique({
        where: { id },
        select: { id: true, estado: true, tipo: true, clienteId: true, items: { select: { productoId: true, cantidad: true, precio: true } } },
      });
      if (!orden) {
        const error = new Error("Orden no encontrada.");
        error.status = 404;
        throw error;
      }
      if (!puedeTransicionar(orden.estado, estado)) {
        const error = new Error(
          `Transición no permitida: ${orden.estado} → ${estado}.`
        );
        error.status = 409;
        throw error;
      }
      // Una venta cancelada o rechazada devuelve la mercancía al kardex; si
      // la transición reactivara una venta, se vuelve a descontar. Las
      // cotizaciones nunca tocan existencias.
      const estabaSinStock = ESTADOS_SIN_STOCK.includes(orden.estado);
      const quedaSinStock = ESTADOS_SIN_STOCK.includes(estado);
      if (orden.tipo === "venta" && estabaSinStock !== quedaSinStock) {
        const referencia = `venta:${id}`;
        if (quedaSinStock) {
          await revertirStock(tx, {
            referencia,
            actor: guard.session.correo,
            motivo: `Venta ${estado}: se devuelve el inventario`,
          });
        } else if (orden.items.length) {
          await descontarStock(tx, {
            referencia,
            items: orden.items,
            ordenId: id,
            actor: guard.session.correo,
            motivo: `Salida por venta ${id}`,
          });
        }
      }

      const actualizada = await tx.orden.update({
        where: { id },
        data: { estado },
        select: { id: true, estado: true, tipo: true },
      });
      await registrarEvento(tx, id, {
        tipo: "estado",
        de: orden.estado,
        a: estado,
        mensaje: nota,
        actor: guard.session.correo,
      });
      await notificarCliente(tx, orden, estado);
      return { anterior: orden.estado, orden: actualizada };
    });

    await writeLog("panel", `Estado de orden ${id}: ${resultado.anterior} → ${estado}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/estado`,
      detalle: { nota, inventario: resultado.orden.tipo === "venta" ? "ajustado si aplica" : "sin cambio" },
    });
    return Response.json(resultado.orden);
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/ordenes/[id]/estado", error);
    return Response.json({ error: "No se pudo cambiar el estado." }, { status: 500 });
  }
}
