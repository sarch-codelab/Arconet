import { deleteSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}
