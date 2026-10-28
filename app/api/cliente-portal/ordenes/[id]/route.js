import { prisma } from '@/lib/prisma';
import { toOrden } from '@/lib/serialize';
import { findClientOrder, requireClientSession, totalPagado } from '@/lib/portal-cliente';
import { registrarEvento } from '@/lib/ventas';
import { checkRateLimit } from '@/lib/rate-limit';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Acciones que el cliente puede ejecutar sobre sus propias cotizaciones.
const ACCIONES = {
  aprobar: { estado: "aprobada", mensaje: "El cliente aprobó la cotización." },
  rechazar: { estado: "rechazada", mensaje: "El cliente rechazó la cotización." },
  cancelar: { estado: "cancelada", mensaje: "El cliente canceló la solicitud." },
};

export async function GET(_request, { params }) {
  const { session, response } = await requireClientSession();
  if (response) return response;
  const { id } = await params;
  try {
    const orden = await findClientOrder(session.clienteId, id);
    if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const pagado = totalPagado(orden.pagos);
    return Response.json({
      ...toOrden(orden),
      pagado,
      saldo: Math.max(Number(orden.monto) - pagado, 0),
      eventos: orden.eventos.map((evento) => ({
        id: evento.id,
        fecha: evento.fecha.toISOString(),
        tipo: evento.tipo,
        de: evento.deEstado,
        a: evento.aEstado,
        mensaje: evento.mensaje || "",
      })),
    });
  } catch (error) {
    console.error("GET /api/cliente-portal/ordenes/[id]", error?.message);
    return Response.json({ error: "No se pudo cargar la orden." }, { status: 503 });
  }
}

/**
 * POST { accion: "aprobar" | "rechazar" | "cancelar", nota? }
 * Valida ownership + transición permitida desde el portal del cliente.
 */
export async function POST(request, { params }) {
  const { session, response } = await requireClientSession();
  if (response) return response;

  const limit = checkRateLimit(`client-action:${session.clienteId}`, { max: 30, windowMs: 60 * 60_000 });
  if (limit.limited) {
    return Response.json({ error: "Demasiadas acciones por ahora. Intenta más tarde." }, { status: 429 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const accion = ACCIONES[body?.accion];
  if (!accion) {
    return Response.json({ error: "Acción inválida. Usá: aprobar, rechazar o cancelar." }, { status: 400 });
  }
  const nota = typeof body?.nota === "string" ? body.nota.trim().slice(0, 500) : "";

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findFirst({
        where: { id, clienteId: session.clienteId },
        select: { id: true, estado: true, tipo: true },
      });
      if (!orden) {
        const error = new Error("Orden no encontrada.");
        error.status = 404;
        throw error;
      }
      if (orden.tipo !== "cotizacion") {
        const error = new Error("Esta acción solo aplica a cotizaciones.");
        error.status = 409;
        throw error;
      }
      if (orden.estado !== "pendiente" && !(orden.estado === "en_proceso" && accion.estado === "aprobada")) {
        const error = new Error(`La cotización ya no admite esta acción (estado actual: ${orden.estado}).`);
        error.status = 409;
        throw error;
      }
      const actualizada = await tx.orden.update({
        where: { id },
        data: { estado: accion.estado },
        select: { id: true, estado: true, tipo: true },
      });
      await registrarEvento(tx, id, {
        tipo: "estado",
        de: orden.estado,
        a: accion.estado,
        mensaje: nota ? `${accion.mensaje} Nota: ${nota}` : accion.mensaje,
        actor: session.correo,
      });
      return { anterior: orden.estado, orden: actualizada };
    });

    await writeLog("cliente-portal", `Cliente ${session.correo}: ${resultado.anterior} → ${resultado.orden.estado} (${id})`, {
      actor: session.correo,
      ruta: `/api/cliente-portal/ordenes/${id}`,
      detalle: { accion: body?.accion },
    });
    return Response.json(resultado.orden);
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/cliente-portal/ordenes/[id]", error?.message);
    return Response.json({ error: "No se pudo registrar la acción." }, { status: 503 });
  }
}
