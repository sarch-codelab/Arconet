import Destacados from "./destacados";

export const metadata = {
  title: "Productos destacados | Catálogo",
  description: "Explora los productos destacados y los equipos disponibles de Arconet para tu próxima instalación.",
  alternates: { canonical: "/catalogo/destacados" },
};

export default function DestacadosPage() {
  return <Destacados />;
}
