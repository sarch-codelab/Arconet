import { requirePermission } from '@/lib/dal';
import { libroDeVentas } from '@/lib/facturacion';
import { csvResponse, xlsxResponse } from '@/lib/export';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Libro de ventas por rango. ?formato=csv|xlsx para exportar. */
export async function GET(request) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") || undefined;
  const hasta = searchParams.get("hasta") || undefined;
  const formato = searchParams.get("formato");

  try {
    const { documentos, totales } = await libroDeVentas({ desde, hasta });

    if (formato === "csv" || formato === "xlsx") {
      const headers = ["Fecha", "Tipo", "Número", "CAI", "Cliente", "RTN", "Subtotal", "Descuento", "ISV", "Total", "Estado"];
      const rows = documentos.map((doc) => [
        new Date(doc.fecha),
        doc.tipo,
        doc.correlativo || "(pendiente)",
        doc.cai || "",
        doc.cliente?.nombre || "",
        doc.cliente?.rtn || "",
        Number(doc.subtotal),
        Number(doc.descuento),
        Number(doc.impuesto),
        Number(doc.total),
        doc.estado,
      ]);
      if (formato === "csv") return csvResponse(`libro-ventas-${stamp()}.csv`, headers, rows);
      return xlsxResponse(`libro-ventas-${stamp()}.xls`, "Libro de ventas", headers, rows);
    }

    return Response.json({
      rango: { desde: desde || null, hasta: hasta || null },
      totales,
      documentos: documentos.map((doc) => ({
        id: doc.id,
        tipo: doc.tipo,
        correlativo: doc.correlativo,
        cai: doc.cai,
        fecha: doc.fecha,
        cliente: doc.cliente?.nombre,
        rtn: doc.cliente?.rtn,
        subtotal: Number(doc.subtotal),
        descuento: Number(doc.descuento),
        impuesto: Number(doc.impuesto),
        total: Number(doc.total),
        estado: doc.estado,
        pdfHash: doc.pdfHash,
      })),
    });
  } catch (error) {
    console.error("GET /api/facturacion/libro-ventas", error?.message);
    return Response.json({ error: "No se pudo generar el libro de ventas." }, { status: 500 });
  }
}
