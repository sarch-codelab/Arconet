import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import { getPermisos } from "@/lib/dal";
import LocalPreviewEntry from "../../local-preview-entry";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NuevaProducto from "./nuevo-producto";

export const metadata = {
  title: "Nuevo producto",
  description: "Registro de producto en el catálogo de Arconet con precios, stock y fotos.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Página completa de nuevo producto (no emergente): el panel administrativo
 * abre este route con toda la forma del producto, igual que la pantalla
 * flotante de edición, pero ocupando toda la página.
 */
export default async function NuevaProductoPage() {
  const session = await getSession();
  if (isLocalPreviewAuthEnabled()) {
    return (
      <LocalPreviewEntry
        protectedPage
        hasCookieSession={Boolean(session)}
        render={(sesion) => <NuevaProducto session={sesion} />}
      />
    );
  }
  if (!session) {
    redirect("/login");
  }
  // La cookie de sesión no incluye permisos: hay que calcularlos del rol en
  // el servidor (admin => todos) para que el cierre de la página funcione.
  const permisos = await getPermisos(session);
  return <NuevaProducto session={{ ...session, permisos }} />;
}
