import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { respuestaImagenConEtag } from "@/lib/imagen-respuesta";

// Foto de un trabajador para el avatar del personal. Mismo criterio que
// /api/productos/<id>/foto: la imagen no viaja en el JSON del listado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, ctx) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: String(id) },
      select: { foto: true },
    });
    return respuestaImagenConEtag(trabajador?.foto, request);
  } catch (error) {
    console.error("GET /api/trabajadores/[id]/foto", error?.message);
    return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
