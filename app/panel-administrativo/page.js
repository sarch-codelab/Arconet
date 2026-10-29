import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import LocalPreviewEntry from "../admin/local-preview-entry";
import { redirect } from "next/navigation";
import { getSession } from '@/lib/session';
import { getPermisos } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { defaultAdminSection } from '@/lib/admin-navigation';
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
  if (isLocalPreviewAuthEnabled()) {
    const params = (await searchParams) || {};
    return <LocalPreviewEntry protectedPage hasCookieSession={Boolean(session)} requestedSection={typeof params.section === "string" ? params.section : ""} />;
  }
  if (!session) {
    // Sin sesion no hay panel: se envia al login interno (que a su vez redirige
    // al panel si la sesion reaparece). Nunca a /admin como pagina muerta.
    redirect("/login");
  }

  const [permisos, rol] = await Promise.all([
    getPermisos(session),
    prisma.rol.findUnique({ where: { slug: session.rol ?? "" }, select: { nombre: true } }),
  ]);

  // Al entrar (o volver a entrar) el panel abre el Resumen, porque cada rol ve
  // ahí sus propios indicadores. Si el rol no tiene reportes, se abre la
  // primera seccion permitida (Mi perfil siempre lo esta).
  const params = (await searchParams) || {};
  const requested = typeof params.section === "string" ? params.section.trim() : "";
  const initialSection = defaultAdminSection(permisos, requested);

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
