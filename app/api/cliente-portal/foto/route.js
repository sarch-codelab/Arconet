import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/portal-cliente";
import { respuestaImagenConEtag } from "@/lib/imagen-respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: session.clienteId }, select: { foto: true } });
    return respuestaImagenConEtag(cliente?.foto, request);
  } catch {
    return new Response("Sin imagen", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
