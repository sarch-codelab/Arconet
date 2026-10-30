import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import {
  DOCUMENT_HEADERS,
  DOCUMENT_SETTINGS_KEYS,
  printOptions,
  renderPurchaseDocument,
} from "@/lib/print-document";
import { SELECT_PURCHASE } from "@/lib/compras-dto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const [order, config] = await Promise.all([
      prisma.ordenCompra.findUnique({ where: { id }, select: SELECT_PURCHASE }),
      prisma.configuracionSistema.findMany({
        where: { clave: { in: DOCUMENT_SETTINGS_KEYS } },
        select: { clave: true, valor: true },
      }),
    ]);
    if (!order) return new Response("Documento no encontrado", { status: 404 });
    return new Response(
      renderPurchaseDocument({
        order,
        settings: Object.fromEntries(
          config.map((row) => [row.clave, row.valor]),
        ),
        ...printOptions(request),
      }),
      { headers: DOCUMENT_HEADERS },
    );
  } catch {
    return new Response("No se pudo generar el documento", { status: 503 });
  }
}
