import { leerImagen } from "@/lib/almacen-fotos";
import { requireSession } from "@/lib/dal";

// Sirve las fotos guardadas en el almacén de archivos.
//
// El nombre del archivo lleva el hash de su contenido, así que la respuesta se
// puede cachear para siempre: si la foto cambia, cambia el nombre. Eso es lo
// que evita que el navegador muestre una imagen vieja después de reemplazarla.
export const runtime = "nodejs";

const CARPETAS_PRIVADAS = new Set(["clientes", "trabajadores", "usuarios"]);

export async function GET(request, ctx) {
  const { ruta } = await ctx.params;
  const [carpeta, archivo] = Array.isArray(ruta) ? ruta : [];

  // Las rutas anidadas o con segmentos raros no llegan al disco.
  if (!carpeta || !archivo || ruta.length !== 2) {
    return new Response("Sin imagen", { status: 404 });
  }

  // Las fotos de productos y categorías son públicas (las usa la tienda); las
  // de clientes, trabajadores y usuarios son datos personales y solo se
  // sirven a una sesión iniciada.
  if (CARPETAS_PRIVADAS.has(carpeta)) {
    const guard = await requireSession();
    if (guard.response) return guard.response;
  }

  const imagen = await leerImagen(carpeta, archivo);
  if (!imagen) return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });

  return new Response(imagen.bytes, {
    status: 200,
    headers: {
      "Content-Type": imagen.mime,
      "Content-Length": String(imagen.bytes.length),
      // Una foto privada no debe quedar en una caché compartida.
      "Cache-Control": CARPETAS_PRIVADAS.has(carpeta)
        ? "private, max-age=31536000, immutable"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
