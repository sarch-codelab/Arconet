import { getSession } from '@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }
  return Response.json({
    nombre: session.nombre,
    correo: session.correo,
    rol: session.rol,
    sucursal: session.sucursal ?? "",
  });
}
