import { prisma } from "../../../../../lib/prisma";
import { requirePermission } from "../../../../../lib/dal";
import { writeLog } from "../../../../../lib/logs";
import { revertirStock } from "../../../../../lib/stock-ventas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const documento = await prisma.documentoFiscal.findUnique({
      where: { id },
      include: {
        cliente: true,
        items: true,
        orden: { select: { id: true, tipo: true, estado: true } },
      },
    });
    if (!documento) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
    return Response.json(documento);
  } catch (error) {
    console.error("GET /api/facturacion/documentos/[id]", error?.message);
    return Response.json({ error: "No se pudo obtener el documento." }, { status: 500 });
  }
}

/**
 * Anulación de un documento emitido. Exige motivo: el documento se conserva
 * (nunca se borra) con estado `anulado` para el libro de ventas.
 * Body: { motivo }
 */
export async function PATCH(request, { params }) {
  const guard = await requirePermission("facturacion:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const motivo = typeof body?.motivo === "string" ? body.motivo.trim().slice(0, 500) : "";
  if (!motivo) {
    return Response.json({ error: "La anulación requiere un motivo." }, { status: 400 });
  }

  try {
    const actual = await prisma.documentoFiscal.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!actual) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
    if (actual.estado === "anulado") {
      return Response.json({ error: "El documento ya está anulado." }, { status: 409 });
    }

    const documento = await prisma.$transaction(
      async (tx) => {
        const anulado = await tx.documentoFiscal.update({
          where: { id },
          data: {
            estado: "anulado",
            motivoAnulacion: motivo,
            anuladoPor: guard.session.correo,
            anuladoAt: new Date(),
          },
        });
        // Si la factura descontó inventario, la anulación lo devuelve.
        await revertirStock(tx, {
          referencia: `factura:${id}`,
          actor: guard.session.correo,
          motivo: `Anulación de factura: ${motivo}`,
        });
        return anulado;
      },
      { timeout: 20_000 }
    );
    await writeLog("panel", `Documento fiscal anulado: ${documento.correlativo || documento.id}`, {
      nivel: "warn",
      actor: guard.session.correo,
      ruta: `/api/facturacion/documentos/${id}`,
      detalle: { motivo },
    });
    return Response.json(documento);
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Documento no encontrado." }, { status: 404 });
    console.error("PATCH /api/facturacion/documentos/[id]", error);
    return Response.json({ error: "No se pudo anular el documento." }, { status: 500 });
  }
}
