import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import { AdminPanel } from "../admin/admin-experience";

export const metadata = {
  title: "Panel de administración",
  description:
    "Panel interno de Arconet para administrar el personal, productos, clientes y sucursales.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ADMIN_SECTIONS = new Set([
  "trabajadores",
  "productos",
  "categorias",
  "sucursales",
  "clientes",
  "cotizaciones",
  "flota",
  "monitoreo",
  "logs",
  "resumen",
  "mi-perfil",
  "ajustes",
]);

export default async function PanelAdministrativoPage({ searchParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin");
  }

  const params = (await searchParams) || {};
  const rawSection = params.section;
  const initialSection =
    typeof rawSection === "string" && ADMIN_SECTIONS.has(rawSection.trim())
      ? rawSection.trim()
      : "";

  return (
    <AdminPanel
      session={{
        nombre: session.nombre,
        correo: session.correo,
        rol: session.rol,
        sucursal: session.sucursal ?? "",
      }}
      initialSection={initialSection}
    />
  );
}
