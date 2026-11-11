import { notFound } from "next/navigation";
import { PRODUCTS } from "../../vitrina-data";
import { FICHAS, FICHA_BASE, FICHA_SLUGS } from "../../ficha-data";
import FichaProducto from "./ficha-producto";
import RegistrarVisto from "../../registrar-visto";

// Fichas editoriales de los 6 «Productos destacados». Se prerenderizan las 6:
// no dependen de la base de datos ni de parámetros dinámicos.
export const dynamicParams = false;

export function generateStaticParams() {
  return FICHA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const producto = PRODUCTS.find((item) => item.id === slug);
  const ficha = FICHAS[slug];
  if (!producto || !ficha) {
    return { title: "Producto no encontrado", robots: { index: false, follow: true } };
  }
  return {
    title: `${producto.name} | Catálogo`,
    description: ficha.descripcion,
    alternates: { canonical: `${FICHA_BASE}/${slug}` },
    openGraph: {
      title: `${producto.name} | Arconet`,
      description: ficha.descripcion,
      url: `${FICHA_BASE}/${slug}`,
      images: [{ url: producto.image, alt: producto.name }],
    },
  };
}

export default async function FichaProductoPage({ params }) {
  const { slug } = await params;
  const producto = PRODUCTS.find((item) => item.id === slug);
  const ficha = FICHAS[slug];
  if (!producto || !ficha) notFound();

  // Primero los de la misma línea y después el resto, para que «relacionados»
  // tenga sentido técnico y no sea un carrusel arbitrario.
  const relacionados = PRODUCTS
    .filter((item) => item.id !== slug)
    .sort((a, b) => Number(b.category === producto.category) - Number(a.category === producto.category))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      line: item.line,
      precio: FICHAS[item.id].precio,
      precioAnterior: FICHAS[item.id].precioAnterior,
    }));

  return <><RegistrarVisto href={producto.href} /><FichaProducto producto={producto} ficha={ficha} relacionados={relacionados} /></>;
}
