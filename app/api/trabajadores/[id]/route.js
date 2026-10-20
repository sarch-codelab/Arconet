import { prisma } from "../../../../lib/prisma";
import { parseTrabajador } from "../../../../lib/trabajadores";
import { toTrabajador } from "../../../../lib/serialize";
import { requireSession } from "../../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  const trabajador = await prisma.trabajador.findUnique({ where: { id } });
  if (!trabajador) return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
  return Response.json(toTrabajador(trabajador));
}

export async function PATCH(request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseTrabajador(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const trabajador = await prisma.trabajador.update({ where: { id }, data });
    return Response.json(toTrabajador(trabajador));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un trabajador con ese correo." }, { status: 409 });
    }
    console.error("PATCH /api/trabajadores/[id]", error);
    return Response.json({ error: "No se pudo actualizar el trabajador." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    await prisma.trabajador.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/trabajadores/[id]", error);
    return Response.json({ error: "No se pudo eliminar el trabajador." }, { status: 500 });
  }
}
