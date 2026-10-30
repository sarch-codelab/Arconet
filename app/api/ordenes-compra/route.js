import { prisma } from "@/lib/prisma";
import {
  parseOrdenCompra,
  siguienteNumeroOC,
  totalesOC,
  validatePurchaseReferences,
  purchaseDueDate,
} from "@/lib/compras";
import { businessPurchaseDate } from "@/lib/compras-form";
import { SELECT_PURCHASE } from "@/lib/compras-dto";
import { requirePermission } from "@/lib/dal";
import { writeLog } from "@/lib/logs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const params = new URL(request.url).searchParams,
    tipo = params.get("tipo") || "compra";
  if (!["compra", "cotizacion"].includes(tipo))
    return Response.json({ error: "Tipo inválido." }, { status: 400 });
  const where = { tipo };
  if (params.get("estado")) where.estado = params.get("estado");
  if (params.get("proveedorId")) where.proveedorId = params.get("proveedorId");
  try {
    return Response.json(
      await prisma.ordenCompra.findMany({
        where,
        orderBy: { fecha: "desc" },
        take: Math.min(
          500,
          Math.max(1, Math.trunc(Number(params.get("take"))) || 100),
        ),
        select: SELECT_PURCHASE,
      }),
      { headers },
    );
  } catch (error) {
    console.error("GET /api/ordenes-compra", error?.message);
    return Response.json(
      { error: "No se pudieron cargar las compras." },
      { status: 503 },
    );
  }
}
export async function POST(request) {
  const guard = await requirePermission("compras:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const { data, errors } = parseOrdenCompra(body);
  if (errors.length)
    return Response.json({ error: errors[0], errors }, { status: 400 });
  if (data.estado === "cancelada")
    return Response.json(
      { error: "Una operación nueva debe comenzar en borrador o confirmada." },
      { status: 400 },
    );
  const { items, ...values } = data;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const validItems = await validatePurchaseReferences(
        tx,
        values.proveedorId,
        items,
      );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('oc-numeracion'))`;
      const fecha =
        values.fecha || new Date(`${businessPurchaseDate()}T12:00:00.000Z`);
      return tx.ordenCompra.create({
        data: {
          ...values,
          fecha,
          fechaVencimiento: purchaseDueDate(
            fecha,
            values.terminos,
            values.diasCredito,
          ),
          numero: await siguienteNumeroOC(tx, values.tipo),
          ...totalesOC(validItems),
          createdBy: guard.session.correo,
          items: { create: validItems },
        },
        select: SELECT_PURCHASE,
      });
    });
    await writeLog(
      "panel",
      `${order.tipo === "cotizacion" ? "Cotización a proveedor" : "Compra"} creada: ${order.numero}`,
      {
        actor: guard.session.correo,
        ruta: "/api/ordenes-compra",
        detalle: { id: order.id, tipo: order.tipo, total: order.total },
      },
    );
    return Response.json(order, { status: 201, headers });
  } catch (error) {
    if (error.status)
      return Response.json({ error: error.message }, { status: error.status });
    if (error.code === "P2002")
      return Response.json(
        { error: "El número ya está registrado. Reintenta." },
        { status: 409 },
      );
    console.error("POST /api/ordenes-compra", error?.message);
    return Response.json(
      { error: "No se pudo guardar. Conserva el borrador y reintenta." },
      { status: 503 },
    );
  }
}
