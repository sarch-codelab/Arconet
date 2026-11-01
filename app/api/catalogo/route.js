import { prisma } from '@/lib/prisma'

export const runtime = "nodejs";
// El catálogo se cachea muy poco: con 60 s un producto recién creado tardaba
// hasta un minuto en aparecer y parecía que el guardado no había funcionado.
export const revalidate = 5;

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      where: { estado: "activo", archivado: false },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        sku: true,
        categoria: true,
        marca: true,
        garantia: true,
        unidad: true,
        descripcion: true,
        precio: true,
        stock: true,
        foto: true,
        fotos: true,
      },
    });

    const items = productos.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku,
      categoria: producto.categoria,
      marca: producto.marca || "",
      garantia: producto.garantia || "",
      unidad: producto.unidad,
      descripcion: producto.descripcion || "",
      precio: Number(producto.precio),
      stock: producto.stock,
      // Las fotos viven en /media o en una URL: se entrega la ruta, nunca el
      // base64. Antes este endpoint arrastraba todas las imágenes y la tienda
      // tenía que descargarlas antes de pintar la primera tarjeta.
      foto: typeof producto.foto === "string" && producto.foto.startsWith("data:") ? `/api/productos/${encodeURIComponent(producto.id)}/foto` : (producto.foto || ""),
      fotos: Array.isArray(producto.fotos)
        ? producto.fotos.map((imagen, indice) => (typeof imagen === "string" && imagen.startsWith("data:")
          ? `/api/productos/${encodeURIComponent(producto.id)}/foto?i=${indice}`
          : imagen))
        : [],
    }));

    return Response.json(items, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25" },
    });
  } catch (error) {
    console.error("GET /api/catalogo", error);
    return Response.json({ error: "No se pudo obtener el catálogo." }, { status: 500 });
  }
}
