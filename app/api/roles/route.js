import { prisma } from "../../../lib/prisma";
import { requireSession, requireRole } from "../../../lib/dal";
import { writeLog } from "../../../lib/logs";

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

export async function GET() {
  // Los roles y sus permisos son información interna del panel: nunca públicos.
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const roles = await prisma.rol.findMany({
      orderBy: { nombre: "asc" },
    });
    return Response.json(roles.map(toRol), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/roles", error?.message);
    return Response.json({ error: "No se pudieron obtener los roles." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { nombre, slug, descripcion, permisos, estado } = body;

  if (!nombre || !nombre.trim()) {
    return Response.json({ error: "El nombre del rol es obligatorio." }, { status: 400 });
  }

  const slugValue = slug?.trim() || nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slugValue) {
    return Response.json({ error: "No se pudo generar el slug del rol." }, { status: 400 });
  }

  const estadoValue = (estado && ["activo", "inactivo"].includes(estado)) ? estado : "activo";
  const descripcionValue = descripcion?.trim() || null;
  const permisosValue = Array.isArray(permisos) ? permisos.filter(Boolean) : [];

  try {
    const rol = await prisma.rol.create({
      data: {
        id: `rol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: nombre.trim(),
        slug: slugValue,
        descripcion: descripcionValue,
        permisos: permisosValue,
        estado: estadoValue,
      },
    });

    await writeLog("panel", `Rol creado: ${rol.nombre}`, {
      actor: guard.session?.correo,
      ruta: "/api/roles",
      detalle: { id: rol.id, slug: rol.slug },
    });

    return Response.json(toRol(rol), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json(
        { error: "Ya existe un rol con ese nombre o slug." },
        { status: 409 },
      );
    }
    console.error("POST /api/roles", error);
    await writeLog("db", `Error al crear rol: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: "/api/roles",
    });
    return Response.json({ error: "No se pudo crear el rol." }, { status: 500 });
  }
}