import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { DOCUMENT_HEADERS, DOCUMENT_SETTINGS_KEYS, ORDER_DOCUMENT_INCLUDE, printOptions, renderOrderDocument } from "@/lib/print-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  try {
    const { id } = await params;
    const [order, config] = await Promise.all([
      prisma.orden.findUnique({ where: { id }, include: ORDER_DOCUMENT_INCLUDE }),
      prisma.configuracionSistema.findMany({ where: { clave: { in: DOCUMENT_SETTINGS_KEYS } }, select: { clave: true, valor: true } }),
    ]);
    if (!order) return new Response("Documento no encontrado", { status: 404 });
    const html = renderOrderDocument({ order, settings: Object.fromEntries(config.map(({ clave, valor }) => [clave, valor])), ...printOptions(request) });
    return new Response(html, { headers: DOCUMENT_HEADERS });
  } catch (error) {
    console.error("GET /api/ordenes/[id]/documento", error?.message);
    return new Response("No se pudo generar el documento", { status: 503 });
  }
}
