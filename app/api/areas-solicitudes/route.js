import { randomUUID } from "node:crypto";
import { prisma } from "../../../lib/prisma";
import { requirePermission, requireSession } from "../../../lib/dal";
import { areaSlug, canSeeAllSolicitudes } from "../../../lib/solicitudes-internas";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validateRoles(roles) {
  if (!Array.isArray(roles) || !roles.length || roles.some((role) => typeof role !== "string")) {
    return { error: "Asigna al menos un rol responsable." };
  }
  const selected = [...new Set(roles)];
  const active = await prisma.rol.findMany({ where: { slug: { in: selected }, estado: "activo" }, select: { slug: true } });
  if (active.length !== selected.length) return { error: "Uno o más roles no existen o están inactivos." };
  return { roles: selected };
}

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const areas = await prisma.areaSolicitud.findMany({
      where: canSeeAllSolicitudes(guard.session) ? {} : { activa: true },
      orderBy: { nombre: "asc" },
    });
    return Response.json(areas, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/areas-solicitudes", error?.message);
    return Response.json({ error: "No se pudieron cargar las áreas." }, { status: 503 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  if (!canSeeAllSolicitudes(guard.session)) return Response.json({ error: "Solo administración puede gestionar las áreas." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
  const slug = areaSlug(nombre);
  const roleValidation = await validateRoles(body?.roles);
  if (nombre.length < 2 || !slug) return Response.json({ error: "El nombre del área debe tener al menos 2 caracteres." }, { status: 400 });
  if (roleValidation.error) return Response.json({ error: roleValidation.error }, { status: 400 });
  try {
    const area = await prisma.areaSolicitud.create({ data: { id: `area-${randomUUID()}`, nombre, slug, roles: roleValidation.roles } });
    await writeLog("panel", `Área de órdenes creada: ${nombre}`, { actor: guard.session.correo, ruta: "/api/areas-solicitudes", detalle: { slug, roles: area.roles } });
    return Response.json(area, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") return Response.json({ error: "Ya existe un área con ese nombre." }, { status: 409 });
    console.error("POST /api/areas-solicitudes", error?.message);
    return Response.json({ error: "No se pudo crear el área." }, { status: 503 });
  }
}
