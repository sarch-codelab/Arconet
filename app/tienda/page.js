import { prisma } from "@/lib/prisma";
import CatalogoExperience from "./catalogo-experience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tienda",
  description:
    "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras.",
  alternates: { canonical: "/tienda" },
  openGraph: {
    type: "website",
    title: "Tienda | Arconet",
    description:
    "Equipos y soluciones de fibra óptica, FTTH, infraestructura y medición de Arconet Honduras.",
    url: "/tienda",
    images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
  },
};

// Las categorías se leen en el servidor y se pasan ya resueltas al componente.
// Antes se pedían al navegador después de montar, así que lo primero que se veía
// eran las fotos de reserva del código y solo después las del panel: ese salto
// es el destello de "imágenes anteriores" al recargar.
async function getCategorias() {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { estado: "activo" },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return categorias.map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      slug: categoria.slug,
      descripcion: categoria.descripcion ?? "",
      foto: categoria.foto ?? "",
      orden: categoria.orden,
      estado: categoria.estado,
    }));
  } catch (error) {
    console.error("GET /tienda", error?.message);
    // Sin base de datos la página sigue sirviendo el catálogo estático.
    return [];
  }
}

export default async function CatalogoPage() {
  const categorias = await getCategorias();
  return <CatalogoExperience categoriasIniciales={categorias} />;
}
