import { cache } from "react";
import { prisma } from '@/lib/prisma';
import { findFamily } from "../../catalogo-data";
import CategoryProducts from "./category-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getCategoria = cache(async function getCategoria(slug) {
  try {
    const categoria = await prisma.categoria.findUnique({ where: { slug } });
    if (!categoria) return null;

    return {
      id: categoria.id,
      nombre: categoria.nombre,
      slug: categoria.slug,
      descripcion: categoria.descripcion || "",
      foto: categoria.foto || "",
      orden: categoria.orden,
      estado: categoria.estado,
    };
  } catch (error) {
    console.error("GET /tienda/categoria/[slug]", error);
    return null;
  }
});

// Mismo criterio de coincidencia que el componente cliente: el producto puede
// guardar el nombre de la línea, el slug, o el nombre con otros acentos.
const normalizarCategoria = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();

// El listado se pinta EN EL SERVIDOR. Antes la página solo traía un esqueleto
// y esperaba a que el navegador hidratara y pidiera /api/catalogo: si un chunk
// fallaba, un bloqueador cortaba la petición o el revelado por scroll no se
// disparaba, el usuario veía la categoría vacía aunque hubiera 50 productos.
// Con los datos iniciales en el HTML, los productos existen desde el primer
// byte y el fetch posterior solo los actualiza.
const getProductosIniciales = cache(async function getProductosIniciales(nombre, slug) {
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

    const objetivoNombre = normalizarCategoria(nombre);
    const objetivoSlug = normalizarCategoria(slug);

    return productos
      .filter((producto) => {
        const categoria = normalizarCategoria(producto.categoria);
        return (objetivoNombre && categoria === objetivoNombre) ||
          (objetivoSlug && categoria === objetivoSlug);
      })
      .map((producto) => ({
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
        // Igual que /api/catalogo: nunca se envía un base64 al navegador.
        foto: typeof producto.foto === "string" && producto.foto.startsWith("data:")
          ? `/api/productos/${encodeURIComponent(producto.id)}/foto`
          : (producto.foto || ""),
        fotos: Array.isArray(producto.fotos)
          ? producto.fotos.map((imagen, indice) =>
              typeof imagen === "string" && imagen.startsWith("data:")
                ? `/api/productos/${encodeURIComponent(producto.id)}/foto?i=${indice}`
                : imagen)
          : [],
      }));
  } catch (error) {
    console.error("GET /tienda/categoria/[slug] productos iniciales", error);
    return [];
  }
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categoria = await getCategoria(slug);
  const family = findFamily(slug);
  const nombre = categoria?.nombre || family?.category;
  const descripcion = categoria?.descripcion || family?.summary;

  if (!nombre || (categoria && categoria.estado !== "activo")) {
    return {
      title: "Línea no encontrada",
      description: "Catálogo técnico de Arconet Honduras.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${nombre} | Arconet`,
    description: descripcion,
    alternates: { canonical: `/tienda/categoria/${categoria?.slug || slug}` },
    openGraph: {
      type: "website",
      title: `${nombre} | Arconet`,
      description: descripcion,
      url: `/tienda/categoria/${categoria?.slug || slug}`,
      images: [{ url: "/arconet.png", width: 1200, height: 200, alt: "Arconet" }],
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const categoria = await getCategoria(slug);

  if (categoria && categoria.estado !== "activo") {
    return <CategoryProducts slug={slug} blocked />;
  }

  const family = findFamily(slug);
  const nombreLinea = categoria?.nombre || family?.category || slug;
  const productosIniciales = await getProductosIniciales(nombreLinea, slug);

  // Solo datos primitivos (y un arreglo de objetos planos) cruzan la frontera
  // servidor → cliente. Pasar el registro completo permitía que el objeto de
  // Categoria terminara en el render de React (error #31).
  return (
    <CategoryProducts
      slug={slug}
      categoryName={categoria?.nombre ?? null}
      categoryDescription={categoria?.descripcion ?? ""}
      categoryPhoto={categoria?.foto ?? ""}
      productosIniciales={productosIniciales}
    />
  );
}
