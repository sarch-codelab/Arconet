import { redirect } from "next/navigation";
import { getSession } from '@/lib/session";
import { AdminLogin } from "./admin-experience";

export const metadata = {
  title: "Acceso administrativo",
  description: "Inicio de sesión para el panel interno de Arconet.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (session) {
    redirect("/panel-administrativo");
  }

  return <AdminLogin />;
}
