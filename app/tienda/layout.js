export const metadata = {
  title: "Tienda",
  description:
    "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras.",
  alternates: { canonical: "/tienda" },
  openGraph: {
    type: "website",
    title: "Tienda | Arconet",
    description:
      "Equipos y soluciones de fibra óptica, CATV y telecomunicaciones de Arconet Honduras.",
    url: "/tienda",
    images: [{ url: "/arconet.png", width: 1200, height: 200, alt: "Arconet" }],
  },
};

export default function CatalogoLayout({ children }) {
  return children;
}
