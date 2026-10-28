import { prisma } from '@/lib/prisma';
import { findFamily } from "../../catalogo-data";
import CategoryProducts from "./category-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCategoria(slug) {
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
    console.error("GET /catalogo/categoria/[slug]", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categoria = await getCategoria(slug);
  const family = findFamily(slug);
  const nombre = categoria?.nombre || family?.category;
  const descripcion = categoria?.descripcion || family?.summary;

  if (!nombre || (categoria && categoria.estado !== "activo")) {
    return {
      title: "Categoría no encontrada",
      description: "Catálogo técnico de Arconet Honduras.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${nombre} | Arconet`,
    description: descripcion,
    alternates: { canonical: `/catalogo/categoria/${categoria?.slug || slug}` },
    openGraph: {
      type: "website",
      title: `${nombre} | Arconet`,
      description: descripcion,
      url: `/catalogo/categoria/${categoria?.slug || slug}`,
      images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const categoria = await getCategoria(slug);

  if (categoria && categoria.estado !== "activo") {
    return <CategoryProducts slug={slug} category={null} blocked />;
  }

  return <CategoryProducts slug={slug} category={categoria} />;
}
