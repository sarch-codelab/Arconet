import { prisma } from "../../../../lib/prisma";
import { requirePermission } from "../../../../lib/dal";
import { writeLog } from "../../../../lib/logs";
import { SUPER_ROLE } from "../../../../lib/permisos";
import { parseRol, toRol } from "../../../../lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function countAssigned(slug) {
  const [trabajadores, usuarios] = await Promise.all([
    prisma.trabajador.count({ where: { rol: slug } }),
    prisma.usuario.count({ where: { rol: slug } }),
  ]);
  return { trabajadores, usuarios };
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("roles:write");
  if (guard.response) return guard.response;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseRol(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });
  // Trabajadores y usuarios guardan el slug del rol: cambiarlo los dejaría huérfanos.
  delete data.slug;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No hay campos para actualizar." }, { status: 400 });
  }

  try {
    const existing = await prisma.rol.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }

    if (existing.slug === SUPER_ROLE) {
      if (guard.session.rol !== SUPER_ROLE) {
        return Response.json(
          { error: "Solo un administrador puede modificar el rol Administrador." },
          { status: 403 },
        );
      }
      if (data.estado && data.estado !== "activo") {
        return Response.json(
          { error: "El rol Administrador no se puede desactivar." },
          { status: 400 },
        );
      }
    }

    if (data.permisos) {
      const added = data.permisos.filter((permiso) => !existing.permisos.includes(permiso));
      if (added.some((permiso) => !guard.permisos.includes(permiso))) {
        return Response.json(
          { error: "No puedes otorgar permisos que tu rol no tiene." },
          { status: 403 },
        );
      }
    }

    const updated = await prisma.rol.update({ where: { id }, data });

    await writeLog("panel", `Rol actualizado: ${updated.nombre}`, {
      actor: guard.session?.correo,
      ruta: `/api/roles/${id}`,
      detalle: { campos: Object.keys(data), permisos: updated.permisos },
    });

    return Response.json(toRol(updated, await countAssigned(updated.slug)));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json(
        { error: "Ya existe un rol con ese nombre o slug." },
        { status: 409 },
      );
    }
    console.error("PATCH /api/roles/[id]", error);
    await writeLog("db", `Error al actualizar rol ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/roles/${id}`,
    });
    return Response.json({ error: "No se pudo actualizar el rol." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("roles:delete");
  if (guard.response) return guard.response;

  const { id } = await params;

  try {
    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }
    if (rol.slug === SUPER_ROLE) {
      return Response.json(
        { error: "El rol Administrador no se puede eliminar." },
        { status: 400 },
      );
    }

    const { trabajadores, usuarios } = await countAssigned(rol.slug);
    if (trabajadores > 0 || usuarios > 0) {
      return Response.json(
        {
          error: `No se puede eliminar: el rol "${rol.nombre}" está asignado a ${trabajadores} trabajador(es) y ${usuarios} usuario(s). Reasígnalos primero.`,
          trabajadores,
          usuarios,
        },
        { status: 409 },
      );
    }

    await prisma.rol.delete({ where: { id } });

    await writeLog("panel", `Rol eliminado: ${rol.nombre}`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/roles/${id}`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/roles/[id]", error);
    await writeLog("db", `Error al eliminar rol ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/roles/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar el rol." }, { status: 500 });
  }
}
