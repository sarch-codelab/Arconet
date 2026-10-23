import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import { getPermisos } from "../../lib/dal";
import { prisma } from "../../lib/prisma";
import { PERMISSION_MODULES, canAccessSection } from "../../lib/permisos";
import { AdminPanel } from "../admin/admin-experience";

export const metadata = {
  title: "Panel de administración",
  description:
    "Panel interno de Arconet para administrar el personal, productos, clientes y sucursales.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanelAdministrativoPage({ searchParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin");
  }

  const [permisos, rol] = await Promise.all([
    getPermisos(session),
    prisma.rol.findUnique({ where: { slug: session.rol ?? "" }, select: { nombre: true } }),
  ]);

  // Solo se abre una seccion que el rol del usuario puede ver; si no, la
  // primera permitida (Mi perfil siempre lo esta).
  const params = (await searchParams) || {};
  const requested = typeof params.section === "string" ? params.section.trim() : "";
  const initialSection = canAccessSection(permisos, requested)
    ? requested
    : PERMISSION_MODULES.map((module) => module.section).find((id) => canAccessSection(permisos, id)) ||
      "mi-perfil";

  return (
    <AdminPanel
      session={{
        nombre: session.nombre,
        correo: session.correo,
        rol: session.rol,
        rolNombre: rol?.nombre ?? session.rol,
        permisos,
        sucursal: session.sucursal ?? "",
      }}
      initialSection={initialSection}
    />
  );
}
