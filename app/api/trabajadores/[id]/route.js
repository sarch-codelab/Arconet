import { prisma } from '@/lib/prisma";
import { checkRolAsignado, parseTrabajador } from '@/lib/trabajadores";
import { toTrabajador } from '@/lib/serialize";
import { parseAcceso, syncUsuario } from '@/lib/usuarios";
import { requirePermission } from '@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("trabajadores:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  const trabajador = await prisma.trabajador.findUnique({ where: { id } });
  if (!trabajador) return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
  const cuenta = await prisma.usuario.findUnique({ where: { correo: trabajador.correo } });
  return Response.json(toTrabajador(trabajador, cuenta));
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("trabajadores:write");
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

  const acceso = parseAcceso(body);
  if (acceso.errors.length) return Response.json({ error: acceso.errors[0], errors: acceso.errors }, { status: 400 });

  try {
    const actual = await prisma.trabajador.findUnique({ where: { id } });
    if (!actual) return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });

    const rolError = await checkRolAsignado(prisma, guard.session, { nuevo: data.rol, actual: actual.rol });
    if (rolError) return Response.json({ error: rolError.error }, { status: rolError.status });

    const cuentaExistente = await prisma.usuario.findUnique({ where: { correo: actual.correo } });
    const quiereAcceso = acceso.accesoPanel;
    if (quiereAcceso && !cuentaExistente && !acceso.password.trim()) {
      return Response.json(
        { error: "Para dar acceso al panel necesitás una contraseña." },
        { status: 400 },
      );
    }

    const trabajador = await prisma.trabajador.update({ where: { id }, data });

    const correoCambio = data.correo && data.correo !== actual.correo;
    if (correoCambio && cuentaExistente) {
      await prisma.usuario.update({
        where: { correo: actual.correo },
        data: { correo: trabajador.correo },
      });
    }

    let cuenta;
    try {
      cuenta = await syncUsuario(prisma, trabajador, acceso);
    } catch (error) {
      if (error?.code === "PASSWORD_REQUIRED") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    return Response.json(toTrabajador(trabajador, cuenta));
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
  const guard = await requirePermission("trabajadores:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const trabajador = await prisma.trabajador.findUnique({ where: { id } });
    if (!trabajador) return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
    const rolError = await checkRolAsignado(prisma, guard.session, { actual: trabajador.rol });
    if (rolError) return Response.json({ error: rolError.error }, { status: rolError.status });
    await prisma.trabajador.delete({ where: { id } });
    await prisma.usuario.deleteMany({ where: { correo: trabajador.correo } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Trabajador no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/trabajadores/[id]", error);
    return Response.json({ error: "No se pudo eliminar el trabajador." }, { status: 500 });
  }
}
