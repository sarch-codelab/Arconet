import { deleteSession, getSession } from "../../../../lib/session";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  await deleteSession();
  if (session) {
    await writeLog("auth", `Cierre de sesión: ${session.correo}`, {
      actor: session.correo,
    });
  }
  return Response.json({ ok: true });
}
