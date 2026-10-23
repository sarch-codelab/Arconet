import { prisma } from "../../../lib/prisma";
import { newOrderId, parseOrden } from "../../../lib/ordenes";
import { toOrden } from "../../../lib/serialize";
import { requirePermission, requireSession } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado");
  const clienteId = searchParams.get("clienteId");
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {};
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;
  if (clienteId) where.clienteId = clienteId;

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
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseOrden(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const { items, ...ordenData } = data;
  try {
    const orden = await prisma.orden.create({
      data: {
        id: newOrderId(),
        ...ordenData,
        monto: ordenData.monto ?? 0,
        items: items?.length ? { create: items } : undefined,
      },
      include: { cliente: true, items: true },
    });
    return Response.json(toOrden(orden), { status: 201 });
  } catch (error) {
    if (error?.code === "P2003") {
      return Response.json({ error: "El cliente indicado no existe." }, { status: 400 });
    }
    console.error("POST /api/ordenes", error);
    return Response.json({ error: "No se pudo crear la orden." }, { status: 500 });
  }
}
