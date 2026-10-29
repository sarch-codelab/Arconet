import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import { getSession } from "@/lib/session";
import { getPermisos } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isLocalPreviewAuthEnabled()) {
    return Response.json({ error: "No encontrado." }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return Response.json({ error: "No autenticado." }, { status: 401 });
  const [permisos, rol] = await Promise.all([
    getPermisos(session),
    prisma.rol.findUnique({ where: { slug: session.rol ?? "" }, select: { nombre: true } }),
  ]);
  return Response.json({
    nombre: session.nombre,
    correo: session.correo,
    rol: session.rol,
    rolNombre: rol?.nombre ?? session.rol,
    permisos,
    sucursal: session.sucursal ?? "",
  }, { headers: { "Cache-Control": "no-store" } });
}
