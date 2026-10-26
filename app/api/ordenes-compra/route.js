import { prisma } from "../../../lib/prisma";
import { parseOrdenCompra, siguienteNumeroOC, totalesOC } from "../../../lib/compras";
import { requirePermission } from "../../../lib/dal";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT_OC = {
  id: true,
  numero: true,
  proveedorId: true,
  estado: true,
  fecha: true,
  fechaEsperada: true,
  fechaRecepcion: true,
  subtotal: true,
  total: true,
  notas: true,
  createdBy: true,
  proveedor: { select: { id: true, nombre: true, rtn: true } },
  items: true,
};

export async function GET(request) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const where = {};
  if (searchParams.get("estado")) where.estado = searchParams.get("estado");
  if (searchParams.get("proveedorId")) where.proveedorId = searchParams.get("proveedorId");
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  try {
    const ordenes = await prisma.ordenCompra.findMany({
      where,
      orderBy: { fecha: "desc" },
      take,
      select: SELECT_OC,
    });
    return Response.json(ordenes);
  } catch (error) {
    console.error("GET /api/ordenes-compra", error?.message);
    return Response.json({ error: "No se pudieron obtener las órdenes de compra." }, { status: 500 });
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
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const { items, ...ordenData } = data;
  const { subtotal, total } = totalesOC(items);

  try {
    const orden = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('oc-numeracion'))`;
      const numero = ordenData.numero || (await siguienteNumeroOC());
      return tx.ordenCompra.create({
        data: {
          numero,
          ...ordenData,
          subtotal,
          total,
          estado: ordenData.estado || "borrador",
          createdBy: guard.session.correo,
          items: {
            create: items.map((item) => ({
              productoId: item.productoId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario,
            })),
          },
        },
        select: SELECT_OC,
      });
    });

    await writeLog("panel", `Orden de compra creada: ${orden.numero}`, {
      actor: guard.session.correo,
      ruta: "/api/ordenes-compra",
      detalle: { ocId: orden.id, total },
    });
    return Response.json(orden, { status: 201 });
  } catch (error) {
    if (error?.code === "P2003") {
      return Response.json({ error: "El proveedor indicado no existe." }, { status: 400 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe una OC con ese número." }, { status: 409 });
    }
    console.error("POST /api/ordenes-compra", error);
    return Response.json({ error: "No se pudo crear la orden de compra." }, { status: 500 });
  }
}
