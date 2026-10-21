import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const revalidate = 60; // cache catalog for 60s

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      where: { estado: "activo" },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        sku: true,
        categoria: true,
        marca: true,
        unidad: true,
        precio: true,
        stock: true,
        foto: true,
      },
    });

    const items = productos.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku,
      categoria: producto.categoria,
      marca: producto.marca || "",
      unidad: producto.unidad,
      precio: Number(producto.precio),
      stock: producto.stock,
      foto: producto.foto || "",
    }));

    return Response.json(items, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/catalogo", error);
    return Response.json({ error: "No se pudo obtener el catálogo." }, { status: 500 });
  }
}
