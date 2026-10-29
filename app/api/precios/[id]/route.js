import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { toPrecio } from "@/lib/serialize";
import { PRICE_FIELDS, parsePrices } from "@/lib/precios";
import { updateProductPrices } from "@/lib/precios-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
  const guard = await requirePermission("precios:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const product = await prisma.producto.findFirst({
      where: { id, archivado: false },
    });
    if (!product)
      return Response.json(
        { error: "Producto no encontrado." },
        { status: 404 },
      );
    const logs = await prisma.log.findMany({
      where: { ruta: `/api/precios/${id}` },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, actor: true, createdAt: true, detalle: true },
    });
    return Response.json(
      {
        producto: toPrecio(product),
        historial: logs.map((log) => {
          let detalle = {};
          try {
            detalle = JSON.parse(log.detalle || "{}");
          } catch {}
          return {
            id: log.id,
            actor: log.actor,
            fecha: log.createdAt,
            ...detalle,
          };
        }),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudo obtener el historial." },
      { status: 500 },
    );
  }
}
export async function PATCH(request, { params }) {
  const guard = await requirePermission("precios:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object" ||
    Object.keys(body).some((key) => ![...PRICE_FIELDS, "version"].includes(key))
  )
    return Response.json(
      { error: "Esta acción solo permite modificar precios." },
      { status: 400 },
    );
  const { data, errors } = parsePrices(body);
  if (!Object.keys(data).length) errors.push("Indica al menos un precio.");
  if (
    body.version !== undefined &&
    body.version !== null &&
    (typeof body.version !== "string" || Number.isNaN(Date.parse(body.version)))
  )
    errors.push("Versión de precios inválida.");
  if (errors.length)
    return Response.json({ error: errors[0] }, { status: 400 });
  try {
    const product = await prisma.$transaction(
      (tx) =>
        updateProductPrices(tx, id, data, {
          actor: guard.session.correo,
          version: body.version,
        }),
      { timeout: 20000 },
    );
    return Response.json(toPrecio(product), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json(
      {
        error: error.status
          ? error.message
          : "No se pudieron guardar los precios.",
      },
      { status: error.status || 500 },
    );
  }
}
