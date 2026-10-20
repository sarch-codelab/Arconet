import { listLogs, serializeLog } from "../../../lib/logs";
import { prisma } from "../../../lib/prisma";
import { requireSession } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const logs = await listLogs({
      categoria: searchParams.get("categoria"),
      nivel: searchParams.get("nivel"),
      limit: searchParams.get("limit"),
      since: searchParams.get("since"),
    });
    return Response.json(logs.map(serializeLog));
  } catch (error) {
    console.error("GET /api/logs", error);
    return Response.json({ error: "No se pudieron obtener los logs." }, { status: 500 });
  }
}

export async function DELETE() {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  try {
    const result = await prisma.log.deleteMany({});
    return Response.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error("DELETE /api/logs", error);
    return Response.json({ error: "No se pudieron limpiar los logs." }, { status: 500 });
  }
}
