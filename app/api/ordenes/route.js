import { prisma } from "../../../lib/prisma";
import { newOrderId, parseOrden } from "../../../lib/ordenes";
import { toOrden } from "../../../lib/serialize";
import { requireSession } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado");
  const clienteId = searchParams.get("clienteId");

  const where = {};
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;
  if (clienteId) where.clienteId = clienteId;

  const ordenes = await prisma.orden.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: { cliente: true, items: true },
  });
  return Response.json(ordenes.map(toOrden));
}

export async function POST(request) {
  const guard = await requireSession();
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
