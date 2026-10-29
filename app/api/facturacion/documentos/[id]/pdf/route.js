import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { DOCUMENT_HEADERS, DOCUMENT_SETTINGS_KEYS, printOptions, renderFiscalDocument } from "@/lib/print-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  try {
    const { id } = await params;
    const [documento, config] = await Promise.all([
      prisma.documentoFiscal.findUnique({
        where: { id },
        include: { cliente: true, items: { include: { producto: { select: { sku: true, unidad: true } } } }, orden: { select: { id: true, notas: true } } },
      }),
      prisma.configuracionSistema.findMany({ where: { clave: { in: DOCUMENT_SETTINGS_KEYS } }, select: { clave: true, valor: true } }),
    ]);
    if (!documento) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
    const html = renderFiscalDocument({ documento, settings: Object.fromEntries(config.map(({ clave, valor }) => [clave, valor])), ...printOptions(request) });
    return new Response(html, {
      headers: {
        ...DOCUMENT_HEADERS,
        "Content-Disposition": `inline; filename="${encodeURIComponent(documento.correlativo || documento.id)}.html"`,
      },
    });
  } catch (error) {
    console.error("GET /api/facturacion/documentos/[id]/pdf", error?.message);
    return Response.json({ error: "No se pudo generar el documento." }, { status: 500 });
  }
}
