import { prisma } from '@/lib/prisma';
import { parsePago, registrarEvento, resumenPagos } from '@/lib/ventas';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.orden.findUnique({ where: { id }, select: { id: true } });
    if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const [pagos, resumen] = await Promise.all([
      prisma.pago.findMany({ where: { ordenId: id }, orderBy: { fecha: "desc" } }),
      resumenPagos(id),
    ]);
    return Response.json({ pagos, resumen });
  } catch (error) {
    console.error("GET /api/ordenes/[id]/pagos", error?.message);
    return Response.json({ error: "No se pudieron obtener los pagos." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const guard = await requirePermission("ordenes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parsePago(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findUnique({ where: { id }, select: { id: true, estado: true } });
      if (!orden) {
        const error = new Error("Orden no encontrada.");
        error.status = 404;
        throw error;
      }
      if (["cancelada", "rechazada"].includes(orden.estado)) {
        const error = new Error("No se aceptan pagos sobre una orden cancelada o rechazada.");
        error.status = 409;
        throw error;
      }
      const pago = await tx.pago.create({
        data: { ...data, ordenId: id, registradoPor: guard.session.correo },
      });
      await registrarEvento(tx, id, {
        tipo: "pago",
        a: data.estado || "confirmado",
        mensaje: `Pago de L ${Number(pago.monto).toFixed(2)} (${pago.metodo})`,
        actor: guard.session.correo,
      });
      return pago;
    });

    const resumen = await resumenPagos(id);
    await writeLog("panel", `Pago registrado en orden ${id}: L ${Number(resultado.monto).toFixed(2)}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes/${id}/pagos`,
      detalle: { pagoId: resultado.id, saldo: resumen?.saldo },
    });
    return Response.json({ pago: resultado, resumen }, { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/ordenes/[id]/pagos", error);
    return Response.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  }
}
