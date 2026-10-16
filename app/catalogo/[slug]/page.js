import { findFamily } from "../catalogo-data";
import ProductDetail from "./product-detail";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const family = findFamily(slug);

  if (!family) {
    return { title: "Arconet | Catálogo", description: "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras." };
  }

  return {
    title: `Arconet | ${family.title}`,
    description: family.summary,
  };
}

export default async function CatalogoProductoPage({ params }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
