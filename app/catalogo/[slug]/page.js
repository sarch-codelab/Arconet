import { findFamily } from "../catalogo-data";
import ProductDetail from "./product-detail";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const family = findFamily(slug);

  if (!family) {
    return {
      title: "Catálogo",
      description:
        "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${family.title} | Arconet`,
    description: family.summary,
    alternates: { canonical: `/catalogo/${slug}` },
    openGraph: {
      type: "website",
      title: `${family.title} | Arconet`,
      description: family.summary,
      url: `/catalogo/${slug}`,
      images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
    },
  };}

export default async function CatalogoProductoPage({ params }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
