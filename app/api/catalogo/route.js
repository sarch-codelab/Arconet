import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      where: { estado: "activo" },
      orderBy: { nombre: "asc" },
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

    return Response.json(items);
  } catch (error) {
    console.error("GET /api/catalogo", error);
    return Response.json({ error: "No se pudo obtener el catálogo." }, { status: 500 });
  }
}
