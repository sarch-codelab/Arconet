import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { respuestaImagenConEtag } from "@/lib/imagen-respuesta";

// Foto de un cliente para el avatar del listado. Mismo criterio que
// /api/productos/<id>/foto: la imagen no viaja en el JSON.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, ctx) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: String(id) },
      select: { foto: true },
    });
    return respuestaImagenConEtag(cliente?.foto, request);
  } catch (error) {
    console.error("GET /api/clientes/[id]/foto", error?.message);
    return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
