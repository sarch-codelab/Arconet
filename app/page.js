import HomeExperience from "./home-experience";
import { getHomeCategorias } from "@/lib/home-categorias";

// Las categorías se administran desde el panel, así que la portada no puede
// quedarse congelada en el build: se revalida cada minuto.
export const revalidate = 60;

export default async function Home() {
  const categorias = await getHomeCategorias();

  return <HomeExperience categorias={categorias} />;
}
