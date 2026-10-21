import { findFamily } from "../../catalogo-data";
import CategoryProducts from "./category-products";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const family = findFamily(slug);

  if (!family) {
    return {
      title: "Categoría no encontrada",
      description: "Catálogo técnico de Arconet Honduras.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${family.category} | Arconet`,
    description: family.summary,
    alternates: { canonical: `/catalogo/categoria/${slug}` },
    openGraph: {
      type: "website",
      title: `${family.category} | Arconet`,
      description: family.summary,
      url: `/catalogo/categoria/${slug}`,
      images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  return <CategoryProducts slug={slug} />;
}
