import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma";
import ProductPage from "./product-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getProduct(id) {
  try {
    const producto = await prisma.producto.findFirst({
      where: {
        estado: "activo",
        archivado: false,
        OR: [{ id }, { sku: id }],
      },
    });

    if (!producto) return null;

    return {
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku,
      categoria: producto.categoria,
      marca: producto.marca || "",
      unidad: producto.unidad || "Unidad",
      descripcion: producto.descripcion || "",
      codigoBarras: producto.codigoBarras || "",
      precio: Number(producto.precio),
      stock: producto.stock,
      foto: producto.foto || "",
      fotos: Array.isArray(producto.fotos) ? producto.fotos : [],
      actualizado: producto.updatedAt ? new Date(producto.updatedAt).toISOString() : null,
    };
  } catch (error) {
    console.error("GET /catalogo/producto/[id]", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Producto no encontrado",
      description: "Catálogo técnico de Arconet Honduras.",
      robots: { index: false, follow: true },
    };
  }

  const description = `${product.nombre} — ${product.categoria}. SKU ${product.sku}${
    product.marca ? ` · ${product.marca}` : ""
  }. Cotiza con Arconet Honduras.`;

  return {
    title: `${product.nombre} | Arconet`,
    description,
    alternates: { canonical: `/catalogo/producto/${product.id}` },
    openGraph: {
      type: "website",
      title: `${product.nombre} | Arconet`,
      description,
      url: `/catalogo/producto/${product.id}`,
      images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
    },
  };
}

export default async function ProductoPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return <ProductPage product={product} />;
}
