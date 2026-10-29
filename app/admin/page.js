import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import LocalPreviewEntry from "./local-preview-entry";
import { redirect } from "next/navigation";
import { getSession } from '@/lib/session';
import { AdminLogin } from "./admin-experience";

export const metadata = {
  title: "Acceso administrativo",
  description: "Inicio de sesión para el panel interno de Arconet.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }) {
  const session = await getSession();
  if (isLocalPreviewAuthEnabled()) {
    const params = (await searchParams) || {};
    return <LocalPreviewEntry hasCookieSession={Boolean(session)} requestedSection={typeof params.section === "string" ? params.section : ""} />;
  }
  if (session) {
    redirect("/panel-administrativo");
  }

  return <AdminLogin />;
}
