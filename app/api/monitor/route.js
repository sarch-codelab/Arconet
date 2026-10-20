import { getSystemStatus } from "../../../lib/monitor";
import { requireSession } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  try {
    const status = await getSystemStatus();
    return Response.json(status);
  } catch (error) {
    console.error("GET /api/monitor", error);
    return Response.json({ error: "No se pudo obtener el estado del sistema." }, { status: 500 });
  }
}
