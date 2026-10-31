import { prisma } from '@/lib/prisma';
import { emitirDocumentoFiscal, TIPOS_DOCUMENTO } from '@/lib/facturacion';
import { descontarStock, tieneSalidas } from '@/lib/stock-ventas';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';
import { canEmitFiscalSale } from '@/lib/permisos';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const where = {};
  if (searchParams.get("tipo")) where.tipo = searchParams.get("tipo");
  if (searchParams.get("estado")) where.estado = searchParams.get("estado");
  if (searchParams.get("clienteId")) where.clienteId = searchParams.get("clienteId");
  if (searchParams.get("ordenId")) where.ordenId = searchParams.get("ordenId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);

  try {
    const documentos = await prisma.documentoFiscal.findMany({
      where,
      orderBy: { fecha: "desc" },
      take,
      include: {
        cliente: { select: { id: true, nombre: true, rtn: true } },
        items: true,
        orden: { select: { id: true, tipo: true, estado: true } },
      },
    });
    return Response.json(documentos);
  } catch (error) {
    console.error("GET /api/facturacion/documentos", error?.message);
    return Response.json({ error: "No se pudieron obtener los documentos." }, { status: 500 });
  }
}

/**
 * Emite un documento fiscal.
 * Body: { tipo, clienteId, ordenId?, impuestoPorcentaje?, items: [...] }
 * Si hay rango autorizado (CAI + serie + correlativo) se asigna número;
 * si no, se emite pendiente de CAI.
 */
export async function POST(request) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  if (!canEmitFiscalSale(guard.permisos)) {
    return Response.json({ error: "No autorizado para emitir ventas." }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const tipo = typeof body?.tipo === "string" ? body.tipo.trim() : "factura";
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    return Response.json({ error: `Tipo inválido. Usá: ${TIPOS_DOCUMENTO.join(", ")}.` }, { status: 400 });
  }
  // El permiso operativo sólo emite facturas; notas de crédito/débito siguen
  // reservadas a la gestión fiscal que ya exigían las demás operaciones.
  if (tipo !== "factura" && !guard.permisos.includes("facturacion:write")) {
    return Response.json({ error: "No autorizado para gestionar notas fiscales." }, { status: 403 });
  }
  const clienteId = typeof body?.clienteId === "string" ? body.clienteId.trim() : "";
  const ordenId = typeof body?.ordenId === "string" ? body.ordenId.trim() : null;
  if (!clienteId) {
    return Response.json({ error: "El cliente es obligatorio." }, { status: 400 });
  }
  if (ordenId && !guard.permisos.includes("facturacion:write")) {
    return Response.json({ error: "La emisión operativa registra una venta directa, sin convertir históricos comerciales." }, { status: 403 });
  }

  try {
    const { documento, tieneRango } = await prisma.$transaction(
      async (tx) => {
        const emitido = await emitirDocumentoFiscal({
          tx,
          tipo,
          clienteId,
          ordenId,
          items: Array.isArray(body?.items) ? body.items : [],
          impuestoPorcentaje: Number(body?.impuestoPorcentaje) || undefined,
          actor: guard.session.correo,
          canDiscount: guard.permisos?.includes("precios:write"),
        });

        // La factura descuenta inventario salvo que su venta ya lo haya hecho
        // (evita descontar dos veces la misma mercancía).
        if (tipo === "factura") {
          const yaDescontado = ordenId ? await tieneSalidas(tx, `venta:${ordenId}`) : false;
          if (!yaDescontado) {
            await descontarStock(tx, {
              referencia: `factura:${emitido.documento.id}`,
              items: emitido.documento.items,
              actor: guard.session.correo,
              motivo: `Salida por factura ${emitido.documento.correlativo || emitido.documento.id}`,
            });
          }
        }

        return emitido;
      },
      { timeout: 20_000 }
    );

    await writeLog("panel", `${tipo} emitido${documento.correlativo ? ` ${documento.correlativo}` : " (pendiente de CAI)"}`, {
      actor: guard.session.correo,
      ruta: "/api/facturacion/documentos",
      detalle: { documentoId: documento.id, total: documento.total, tieneRango },
    });
    return Response.json({ documento, tieneRango }, { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2003") {
      return Response.json({ error: "El cliente o el producto indicado no existe." }, { status: 400 });
    }
    console.error("POST /api/facturacion/documentos", error);
    return Response.json({ error: "No se pudo emitir el documento." }, { status: 500 });
  }
}
