import { prisma } from '@/lib/prisma';
import { newOrderId, parseOrden } from '@/lib/ordenes';
import { toOrden } from '@/lib/serialize';
import { requirePermission, requireSession } from '@/lib/dal';
import { getClientSession } from '@/lib/client-session';
import { writeLog } from '@/lib/logs';
import { checkRateLimit } from '@/lib/rate-limit';
import { descontarStock, isStockSale } from '@/lib/stock-ventas';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clientSessionIsActive(session) {
  const account = await prisma.clienteCuenta.findUnique({
    where: { clienteId: session.clienteId },
    select: { activo: true, cliente: { select: { estado: true } } },
  });
  return Boolean(account?.activo && account.cliente.estado !== "inactivo");
}

export async function GET(request) {
  const clientSession = await getClientSession();
  if (clientSession) {
    try {
      if (!(await clientSessionIsActive(clientSession))) {
        return Response.json({ error: "La cuenta está desactivada." }, { status: 401 });
      }
    } catch (error) {
      console.error("GET /api/ordenes client auth", error?.message);
      return Response.json({ error: "No se pudo verificar la cuenta." }, { status: 503 });
    }
  } else {
    const guard = await requireSession();
    if (guard.response) return guard.response;
  }
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado");
  const clienteId = searchParams.get("clienteId");
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {};
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;
  if (clientSession) where.clienteId = clientSession.clienteId;
  else if (clienteId) where.clienteId = clienteId;

  try {
    const ordenes = await prisma.orden.findMany({
      where,
      orderBy: { fecha: "desc" },
      take,
      skip,
      select: {
        id: true, tipo: true, clienteId: true, fecha: true, monto: true,
        estado: true, notas: true,
        cliente: { select: { nombre: true } },
        items: { select: { productoId: true, nombre: true, cantidad: true, precio: true } },
      },
    });
    return Response.json(ordenes.map(toOrden));
  } catch (error) {
    console.error("GET /api/ordenes", error?.message);
    return Response.json({ error: "No se pudieron obtener las ordenes." }, { status: 500 });
  }
}

export async function POST(request) {
  const clientSession = await getClientSession();
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (clientSession) {
    const limit = checkRateLimit(`client-order:${clientSession.clienteId}`, { max: 10, windowMs: 60 * 60_000 });
    if (limit.limited) {
      return Response.json({ error: "Alcanzaste el límite de solicitudes por ahora. Intenta más tarde." }, { status: 429 });
    }
    try {
      if (!(await clientSessionIsActive(clientSession))) {
        return Response.json({ error: "La cuenta está desactivada." }, { status: 401 });
      }
    } catch (error) {
      console.error("POST /api/ordenes client auth", error?.message);
      return Response.json({ error: "No se pudo verificar la cuenta." }, { status: 503 });
    }

    const proyecto = typeof body?.proyecto === "string" ? body.proyecto.trim().slice(0, 180) : "";
    const descripcion = typeof body?.descripcion === "string" ? body.descripcion.trim().slice(0, 3000) : "";
    const tipoSolicitud = ["cotizacion", "proyecto", "mantenimiento"].includes(body?.tipo)
      ? body.tipo
      : "";
    const urgencia = ["baja", "normal", "alta", "urgente"].includes(body?.urgencia)
      ? body.urgencia
      : "";
    const presupuesto = body?.presupuesto === "" || body?.presupuesto == null
      ? null
      : Number(body.presupuesto);
    if (!proyecto || !descripcion || !tipoSolicitud || !urgencia) {
      return Response.json({ error: "Completa el proyecto, la descripción y los detalles de la solicitud." }, { status: 400 });
    }
    if (presupuesto !== null && (!Number.isFinite(presupuesto) || presupuesto < 0)) {
      return Response.json({ error: "El presupuesto estimado no es válido." }, { status: 400 });
    }

    const notes = [
      `Proyecto: ${proyecto}`,
      `Tipo de solicitud: ${tipoSolicitud}`,
      `Urgencia: ${urgencia}`,
      `Descripción: ${descripcion}`,
      presupuesto === null ? "" : `Presupuesto estimado: L ${presupuesto.toLocaleString("es-HN")}`,
    ].filter(Boolean).join("\n");
    try {
      const order = await prisma.orden.create({
        data: {
          id: newOrderId(),
          tipo: "cotizacion",
          clienteId: clientSession.clienteId,
          monto: 0,
          estado: "pendiente",
          notas: notes,
        },
        include: { cliente: true, items: true },
      });
      await writeLog("panel", `Nueva solicitud de cotización: ${order.id}`, {
        actor: clientSession.correo,
        ruta: "/api/ordenes",
        detalle: { orderId: order.id, tipoSolicitud },
      });
      return Response.json(toOrden(order), { status: 201 });
    } catch (error) {
      console.error("POST /api/ordenes client request", error?.message);
      return Response.json({ error: "No se pudo guardar la solicitud." }, { status: 503 });
    }
  }

  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;

  const { data, errors } = parseOrden(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const { items, ...ordenData } = data;
  try {
    const orden = await prisma.$transaction(
      async (tx) => {
        const creada = await tx.orden.create({
          data: {
            id: newOrderId(),
            ...ordenData,
            monto: ordenData.monto ?? 0,
            items: items?.length ? { create: items } : undefined,
          },
          include: { cliente: true, items: true },
        });

        // Una venta descuenta inventario al emitirse; una cotización no toca
        // existencias. El descuento comparte transacción con la orden: si no
        // hay stock suficiente, la venta no se crea.
        if (isStockSale(creada) && creada.items.length) {
          await descontarStock(tx, {
            referencia: `venta:${creada.id}`,
            items: creada.items,
            ordenId: creada.id,
            actor: guard.session?.correo ?? null,
            motivo: `Salida por venta ${creada.id}`,
          });
        }

        return creada;
      },
      { timeout: 20_000 },
    );
    await writeLog("panel", `${orden.tipo === "venta" ? "Venta" : "Cotización"} creada ${isStockSale(orden) ? "con descuento de inventario" : "sin afectar inventario"}: ${orden.id}`, {
      actor: guard.session?.correo,
      ruta: "/api/ordenes",
      detalle: { ordenId: orden.id, tipo: orden.tipo, monto: String(orden.monto) },
    });
    return Response.json(toOrden(orden), { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2003") {
      return Response.json({ error: "El cliente o el producto indicado no existe." }, { status: 400 });
    }
    console.error("POST /api/ordenes", error);
    return Response.json({ error: "No se pudo crear la orden." }, { status: 500 });
  }
}
