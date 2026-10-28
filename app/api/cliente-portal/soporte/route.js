import { prisma } from '@/lib/prisma";
import { requireClientSession } from '@/lib/portal-cliente";
import { checkRateLimit } from '@/lib/rate-limit";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS_TICKET = ["abierto", "en_proceso", "resuelto", "cerrado"];

/**
 * GET — tickets de soporte del cliente (solicitudes tipo "soporte").
 */
export async function GET() {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const tickets = await prisma.orden.findMany({
      where: { clienteId: session.clienteId, notas: { contains: "Ticket de soporte" } },
      orderBy: { fecha: "desc" },
      take: 30,
      select: { id: true, fecha: true, estado: true, notas: true },
    });
    return Response.json(tickets.map((ticket) => ({
      id: ticket.id,
      fecha: ticket.fecha.toISOString(),
      estado: ticket.estado,
      detalle: ticket.notas || "",
    })));
  } catch (error) {
    console.error("GET /api/cliente-portal/soporte", error?.message);
    return Response.json({ error: "No se pudieron cargar los tickets." }, { status: 503 });
  }
}

/**
 * POST { asunto, mensaje } — crea un ticket real con seguimiento.
 */
export async function POST(request) {
  const { session, response } = await requireClientSession();
  if (response) return response;

  const limit = checkRateLimit(`client-ticket:${session.clienteId}`, { max: 10, windowMs: 60 * 60_000 });
  if (limit.limited) {
    return Response.json({ error: "Demasiados tickets por ahora. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const asunto = typeof body?.asunto === "string" ? body.asunto.trim().slice(0, 150) : "";
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim().slice(0, 2000) : "";
  if (!asunto || !mensaje) {
    return Response.json({ error: "Completa el asunto y la descripción del problema." }, { status: 400 });
  }

  try {
    const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const notas = [
      "Ticket de soporte",
      `Asunto: ${asunto}`,
      `Mensaje: ${mensaje}`,
    ].join("\n");
    const orden = await prisma.orden.create({
      data: {
        id,
        tipo: "cotizacion",
        clienteId: session.clienteId,
        monto: 0,
        estado: "pendiente",
        notas,
      },
      select: { id: true, fecha: true, estado: true, notas: true },
    });
    await writeLog("cliente-portal", `Nuevo ticket de soporte: ${id} (${asunto})`, {
      actor: session.correo,
      ruta: "/api/cliente-portal/soporte",
      detalle: { ticketId: id },
    });
    return Response.json({
      id: orden.id,
      fecha: orden.fecha.toISOString(),
      estado: ESTADOS_TICKET[0],
      detalle: orden.notas,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cliente-portal/soporte", error?.message);
    return Response.json({ error: "No se pudo crear el ticket." }, { status: 503 });
  }
}
