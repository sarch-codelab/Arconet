import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PANEL_THEMES } from "@/lib/panel-theme";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const options = { headers: { "Cache-Control": "private, no-store" } };
export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const account = await prisma.usuario.findUnique({
      where: { correo: guard.session.correo },
      select: { temaPanel: true },
    });
    return account
      ? Response.json({ theme: account.temaPanel }, options)
      : Response.json({ error: "Cuenta no encontrada." }, { status: 404 });
  } catch {
    return Response.json(
      { error: "No se pudo cargar la apariencia." },
      { status: 503 },
    );
  }
}
export async function PATCH(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!PANEL_THEMES.includes(body?.theme))
    return Response.json(
      { error: "Selecciona claro, oscuro o sistema." },
      { status: 400 },
    );
  try {
    const account = await prisma.usuario.update({
      where: { correo: guard.session.correo },
      data: { temaPanel: body.theme },
      select: { temaPanel: true },
    });
    return Response.json({ theme: account.temaPanel }, options);
  } catch {
    return Response.json(
      { error: "No se pudo guardar la apariencia." },
      { status: 503 },
    );
  }
}
