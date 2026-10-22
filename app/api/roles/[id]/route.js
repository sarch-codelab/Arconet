import { prisma } from "../../../../lib/prisma";
import { requireRole } from "../../../../lib/dal";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toRol(rol) {
  return {
    id: rol.id,
    nombre: rol.nombre,
    slug: rol.slug,
    descripcion: rol.descripcion ?? "",
    permisos: rol.permisos ?? [],
    estado: rol.estado,
    createdAt: rol.createdAt,
    updatedAt: rol.updatedAt,
  };
}

export async function PATCH(request, { params }) {
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { nombre, slug, descripcion, permisos, estado } = body;

  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) {
      return Response.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
    }
    data.nombre = nombre.trim();
  }
  if (slug !== undefined) {
    const slugValue = slug?.trim() || (nombre?.trim()?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "");
    if (!slugValue) {
      return Response.json({ error: "El slug es obligatorio." }, { status: 400 });
    }
    data.slug = slugValue;
  }
  if (descripcion !== undefined) {
    data.descripcion = descripcion?.trim() || null;
  }
  if (permisos !== undefined) {
    data.permisos = Array.isArray(permisos) ? permisos.filter(Boolean) : [];
  }
  if (estado !== undefined) {
    if (!["activo", "inactivo"].includes(estado)) {
      return Response.json({ error: "Estado inválido. Usa: activo, inactivo." }, { status: 400 });
    }
    data.estado = estado;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No hay campos para actualizar." }, { status: 400 });
  }

  try {
    const existing = await prisma.rol.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }

    const updated = await prisma.rol.update({ where: { id }, data });

    await writeLog("panel", `Rol actualizado: ${updated.nombre}`, {
      actor: guard.session?.correo,
      ruta: `/api/roles/${id}`,
      detalle: { campos: Object.keys(data) },
    });

    return Response.json(toRol(updated));
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
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;

  const { id } = await params;

  try {
    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) {
      return Response.json({ error: "Rol no encontrado." }, { status: 404 });
    }

    // Verificar si hay trabajadores o usuarios usando este rol
    const [trabajadores, usuarios] = await Promise.all([
      prisma.trabajador.count({ where: { rol: rol.nombre } }),
      prisma.usuario.count({ where: { rol: rol.nombre } }),
    ]);
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