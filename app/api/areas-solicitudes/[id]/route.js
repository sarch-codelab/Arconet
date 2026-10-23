import { prisma } from "../../../../lib/prisma";
import { requirePermission } from "../../../../lib/dal";
import { areaSlug, canSeeAllSolicitudes } from "../../../../lib/solicitudes-internas";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validateRoles(roles) {
  if (!Array.isArray(roles) || !roles.length || roles.some((role) => typeof role !== "string")) return { error: "Asigna al menos un rol responsable." };
  const selected = [...new Set(roles)];
  const active = await prisma.rol.findMany({ where: { slug: { in: selected }, estado: "activo" }, select: { slug: true } });
  if (active.length !== selected.length) return { error: "Uno o más roles no existen o están inactivos." };
  return { roles: selected };
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  if (!canSeeAllSolicitudes(guard.session)) return Response.json({ error: "Solo administración puede gestionar las áreas." }, { status: 403 });
  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const data = {};
  if (Object.hasOwn(body || {}, "nombre")) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
    if (nombre.length < 2) return Response.json({ error: "El nombre del área debe tener al menos 2 caracteres." }, { status: 400 });
    if (!areaSlug(nombre)) return Response.json({ error: "El nombre debe contener letras o números." }, { status: 400 });
    data.nombre = nombre;
  }
  if (Object.hasOwn(body || {}, "roles")) {
    const validation = await validateRoles(body.roles);
    if (validation.error) return Response.json({ error: validation.error }, { status: 400 });
    data.roles = validation.roles;
  }
  if (Object.hasOwn(body || {}, "activa")) {
    if (typeof body.activa !== "boolean") return Response.json({ error: "El estado del área no es válido." }, { status: 400 });
    data.activa = body.activa;
  }
  if (!Object.keys(data).length) return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
  try {
    if (data.nombre) {
      const duplicate = await prisma.areaSolicitud.findFirst({ where: { id: { not: id }, slug: areaSlug(data.nombre) }, select: { id: true } });
      if (duplicate) return Response.json({ error: "Ya existe un área con ese nombre." }, { status: 409 });
    }
    const area = await prisma.areaSolicitud.update({ where: { id }, data });
    await writeLog("panel", `Área de órdenes actualizada: ${area.nombre}`, { actor: guard.session.correo, ruta: `/api/areas-solicitudes/${id}`, detalle: data });
    return Response.json(area);
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "No se encontró el área." }, { status: 404 });
    if (error?.code === "P2002") return Response.json({ error: "Ya existe un área con ese nombre." }, { status: 409 });
    console.error("PATCH /api/areas-solicitudes/[id]", error?.message);
    return Response.json({ error: "No se pudo actualizar el área." }, { status: 503 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  if (!canSeeAllSolicitudes(guard.session)) return Response.json({ error: "Solo administración puede gestionar las áreas." }, { status: 403 });
  const { id } = await params;
  try {
    const area = await prisma.areaSolicitud.update({ where: { id }, data: { activa: false } });
    await writeLog("panel", `Área de órdenes desactivada: ${area.nombre}`, { actor: guard.session.correo, ruta: `/api/areas-solicitudes/${id}` });
    return Response.json(area);
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "No se encontró el área." }, { status: 404 });
    console.error("DELETE /api/areas-solicitudes/[id]", error?.message);
    return Response.json({ error: "No se pudo desactivar el área." }, { status: 503 });
  }
}
