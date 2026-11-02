import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import { getPermisos } from "@/lib/dal";
import LocalPreviewEntry from "../../local-preview-entry";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NuevaVenta from "./nueva-venta";

export const metadata = {
  title: "Nueva venta · Factura fiscal",
  description: "Registro de venta fiscal con previsualización de la factura en vivo.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Página completa de nueva venta (no emergente): el panel administrative
 * abre este route con los datos de la venta y la previsualización en vivo
 * de la factura a la derecha.
 */
export default async function NuevaVentaPage() {
  const session = await getSession();
  if (isLocalPreviewAuthEnabled()) {
    return (
      <LocalPreviewEntry
        protectedPage
        hasCookieSession={Boolean(session)}
        render={(sesion) => <NuevaVenta session={sesion} />}
      />
    );
  }
  if (!session) {
    redirect("/login");
  }
  // La cookie de sesión no incluye permisos: hay que calcularlos del rol en
  // el servidor (admin => todos) para que el cierre de la página funcione.
  const permisos = await getPermisos(session);
  return <NuevaVenta session={{ ...session, permisos }} />;
}
