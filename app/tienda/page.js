import CatalogoExperience from "./catalogo-experience";

export const metadata = {
  title: "Catálogo",
  description:
    "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras.",
  alternates: { canonical: "/tienda" },
  openGraph: {
    type: "website",
    title: "Catálogo | Arconet",
    description:
    "Equipos y soluciones de fibra óptica, FTTH, infraestructura y medición de Arconet Honduras.",
    url: "/tienda",
    images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
  },
};

export default function CatalogoPage() {
  return <CatalogoExperience />;
}
