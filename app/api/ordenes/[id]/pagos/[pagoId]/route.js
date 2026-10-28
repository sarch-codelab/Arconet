import { prisma } from '@/lib/prisma";
import { parsePago, registrarEvento, resumenPagos } from '@/lib/ventas";
import { requirePermission } from '@/lib/dal";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Anulación (estado anulado) o corrección de un pago, con evento en el historial. */
export async function PATCH(request, { params }) {
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  const { id, pagoId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parsePago(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({ where: { id: pagoId } });
      if (!pago || pago.ordenId !== id) {
        const error = new Error("Pago no encontrado.");
        error.status = 404;
        throw error;
      }
      if (pago.estado === "anulado" && data.estado !== "anulado") {
        const error = new Error("Un pago anulado no se puede reactivar: registrá uno nuevo.");
        error.status = 409;
        throw error;
      }
      const actualizado = await tx.pago.update({ where: { id: pagoId }, data });
      await registrarEvento(tx, id, {
        tipo: "pago",
        de: pago.estado,
        a: actualizado.estado,
        mensaje:
          actualizado.estado === "anulado"
            ? `Pago anulado: L ${Number(pago.monto).toFixed(2)}`
            : `Pago actualizado: L ${Number(actualizado.monto).toFixed(2)}`,
        actor: guard.session.correo,
      });
      return actualizado;
    });

    const resumen = await resumenPagos(id);
    await writeLog("panel", `Pago ${resultado.estado} en orden ${id}`, {
      nivel: resultado.estado === "anulado" ? "warn" : "info",
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/pagos/${pagoId}`,
    });
    return Response.json({ pago: resultado, resumen });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("PATCH /api/ordenes/[id]/pagos/[pagoId]", error);
    return Response.json({ error: "No se pudo actualizar el pago." }, { status: 500 });
  }
}
