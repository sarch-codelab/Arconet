import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { respuestaImagenConEtag } from "@/lib/imagen-respuesta";

// Sirve la foto de un producto guardada en la base como data URL.
//
// Existe para que los listados no tengan que arrastrar la imagen en el JSON:
// /api/productos entrega /api/productos/<id>/foto?v=<huella> y el navegador
// pide aquí los bytes solo cuando la fila se pinta. El parámetro `i` elige una
// imagen de la galería.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, ctx) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  // `Number(null)` es 0: sin esta guarda, la petición sin `?i=` leía la primera
  // imagen de la galería (normalmente vacía) en vez de la foto principal.
  const crudo = new URL(request.url).searchParams.get("i");
  const indice = crudo === null ? null : Number(crudo);

  try {
    const producto = await prisma.producto.findUnique({
      where: { id: String(id) },
      select: { foto: true, fotos: true },
    });
    if (!producto) return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });

    const valor = indice !== null && Number.isInteger(indice) && indice >= 0
      ? producto.fotos?.[indice]
      : producto.foto;

    return respuestaImagenConEtag(valor, request);
  } catch (error) {
    console.error("GET /api/productos/[id]/foto", error?.message);
    return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
