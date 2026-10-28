import { prisma } from '@/lib/prisma';
import { requirePermission, requireSession } from '@/lib/dal';
import { writeLog } from '@/lib/logs';
import { newRolId, parseRol, toRol } from '@/lib/roles';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Los roles y sus permisos son información interna del panel: nunca públicos.
  // Cualquier sesión puede leerlos porque el formulario de trabajadores los usa.
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const [roles, trabajadores, usuarios] = await Promise.all([
      prisma.rol.findMany({ orderBy: { nombre: "asc" } }),
      prisma.trabajador.groupBy({ by: ["rol"], _count: { _all: true } }),
      prisma.usuario.groupBy({ by: ["rol"], _count: { _all: true } }),
    ]);
    const count = (rows, slug) => rows.find((row) => row.rol === slug)?._count._all ?? 0;
    return Response.json(
      roles.map((rol) =>
        toRol(rol, {
          trabajadores: count(trabajadores, rol.slug),
          usuarios: count(usuarios, rol.slug),
        }),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/roles", error?.message);
    return Response.json({ error: "No se pudieron obtener los roles." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("roles:write");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseRol(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  // Nadie puede crear un rol con privilegios que él mismo no tiene.
  const permisos = data.permisos ?? [];
  if (permisos.some((permiso) => !guard.permisos.includes(permiso))) {
    return Response.json(
      { error: "No puedes otorgar permisos que tu rol no tiene." },
      { status: 403 },
    );
  }

  try {
    const rol = await prisma.rol.create({
      data: { id: newRolId(), estado: "activo", ...data, permisos },
    });

    await writeLog("panel", `Rol creado: ${rol.nombre}`, {
      actor: guard.session?.correo,
      ruta: "/api/roles",
      detalle: { id: rol.id, slug: rol.slug, permisos: rol.permisos },
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
