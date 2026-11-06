import CatalogoExperience from "./catalogo-experience";

export const metadata = {
  title: "Catálogo",
  description:
    "Vitrina de equipos de fibra óptica, instrumentos de medición, gabinetes y herramientas de Arconet. Explora las líneas y cotiza con nuestro equipo en Honduras.",
  alternates: { canonical: "/catalogo" },
  openGraph: {
    title: "Catálogo | Arconet",
    description:
      "Equipos y líneas de telecomunicaciones de Arconet: fibra óptica, medición, gabinetes y herramientas.",
    url: "/catalogo",
    images: [{ url: "/catalogo-vitrina/hero-banner.jpg", width: 2048, height: 683, alt: "Equipos de fibra óptica de Arconet" }],
  },
};

export default function CatalogoPage() {
  return <CatalogoExperience />;
}
