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

export default async function PanelAdministrativoPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin");
  }

  return (
    <AdminPanel
      session={{
        nombre: session.nombre,
        correo: session.correo,
        rol: session.rol,
        sucursal: session.sucursal ?? "",
      }}
    />
  );
}
