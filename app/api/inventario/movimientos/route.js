import { prisma } from '@/lib/prisma';
import { aplicarMovimiento, parseMovimiento } from '@/lib/inventario';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Registra un movimiento de kardex (entrada, salida, ajuste, transferencia, devolución). */
export async function POST(request) {
  const guard = await requirePermission("inventario:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseMovimiento(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const movimiento = await prisma.$transaction(
      async (tx) =>
        aplicarMovimiento(tx, {
          ...data,
          actor: guard.session.correo,
        }),
      { timeout: 20_000 }
    );

    await writeLog("panel", `Kardex ${data.tipo}: ${data.cantidad} u. del producto ${data.productoId}`, {
      nivel: data.tipo === "ajuste" ? "warn" : "info",
      actor: guard.session.correo,
      ruta: "/api/inventario/movimientos",
      detalle: { movimientoId: movimiento.id, ...data },
    });

    return Response.json(movimiento, { status: 201 });
  } catch (error) {
    if (error?.status) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/inventario/movimientos", error);
    return Response.json({ error: "No se pudo registrar el movimiento." }, { status: 500 });
  }
}
