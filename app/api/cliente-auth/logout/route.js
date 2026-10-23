import { deleteClientSession, getClientSession } from "../../../../lib/client-session";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getClientSession();
  await deleteClientSession();
  if (session) {
    await writeLog("auth", `Cierre de sesión de cliente: ${session.correo}`, {
      actor: session.correo,
      ruta: "/api/cliente-auth/logout",
    });
  }
  return Response.json({ ok: true });
}
