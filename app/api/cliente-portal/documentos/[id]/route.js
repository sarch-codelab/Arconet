import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/portal-cliente";
import { DOCUMENT_HEADERS, DOCUMENT_SETTINGS_KEYS, ORDER_DOCUMENT_INCLUDE, printOptions, renderOrderDocument } from "@/lib/print-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Misma plantilla que administración, pero exclusivamente de la propia
// orden del cliente. Conservar el filtro de pertenencia (anti-IDOR).
export async function GET(request, { params }) {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const { id } = await params;
    const [order, config] = await Promise.all([
      prisma.orden.findFirst({ where: { id, clienteId: session.clienteId }, include: ORDER_DOCUMENT_INCLUDE }),
      prisma.configuracionSistema.findMany({ where: { clave: { in: DOCUMENT_SETTINGS_KEYS } }, select: { clave: true, valor: true } }),
    ]);
    if (!order) return new Response("Documento no encontrado", { status: 404 });
    const html = renderOrderDocument({ order, settings: Object.fromEntries(config.map(({ clave, valor }) => [clave, valor])), ...printOptions(request) });
    return new Response(html, { headers: DOCUMENT_HEADERS });
  } catch (error) {
    console.error("GET /api/cliente-portal/documentos/[id]", error?.message);
    return new Response("No se pudo generar el documento", { status: 503 });
  }
}
