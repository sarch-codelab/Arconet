import { prisma } from "@/lib/prisma";
import { respuestaImagen } from "@/lib/imagen-respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Las fotos antiguas almacenadas como data URL necesitan una ruta pública
// distinta de la API administrativa. Solo se publica la imagen principal de
// productos visibles y con existencia; no se exponen las demás columnas.
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const producto = await prisma.producto.findFirst({
      where: { id, estado: "activo", archivado: false, stock: { gt: 0 } },
      select: { foto: true },
    });
    if (!producto) return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });
    const response = respuestaImagen(producto.foto, { etag: false });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("GET /api/foto-catalogo/[id]", error?.message);
    return new Response("Sin imagen", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
