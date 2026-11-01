import { prisma } from "@/lib/prisma";

/**
 * Categorías activas para la portada.
 *
 * La portada las lista tal como están en la base de datos (tabla Categoria),
 * en el orden que define el panel administrativo. Si la consulta falla, la
 * portada se queda sin la lista en vez de romperse entera.
 */
export async function getHomeCategorias() {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { estado: "activo" },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, slug: true },
    });

    return categorias.map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      slug: categoria.slug,
      href: `/tienda/categoria/${categoria.slug}`,
    }));
  } catch (error) {
    console.error("getHomeCategorias", error?.message);
    return [];
  }
}
