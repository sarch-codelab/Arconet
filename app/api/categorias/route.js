import { prisma } from "../../../lib/prisma";
import { newCategoriaId, parseCategoria } from "../../../lib/categorias";
import { requireRole } from "../../../lib/dal";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCategoria(categoria) {
  return {
    id: categoria.id,
    nombre: categoria.nombre,
    slug: categoria.slug,
    descripcion: categoria.descripcion ?? "",
    foto: categoria.foto ?? "",
    orden: categoria.orden,
    estado: categoria.estado,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const where = estado ? { estado } : {};

  try {
    const categorias = await prisma.categoria.findMany({
      where,
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return Response.json(categorias.map(toCategoria), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/categorias", error?.message);
    return Response.json({ error: "No se pudieron obtener las categorías." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireRole(["administrador", "gerente"]);
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseCategoria(body);
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  try {
    if (data.orden === undefined) {
      const max = await prisma.categoria.aggregate({ _max: { orden: true } });
      data.orden = (max._max.orden ?? 0) + 1;
    }

    const categoria = await prisma.categoria.create({
      data: { id: newCategoriaId(), ...data },
    });

    await writeLog("panel", `Categoría creada: ${categoria.nombre}`, {
      actor: guard.session?.correo,
      ruta: "/api/categorias",
      detalle: { id: categoria.id, slug: categoria.slug },
    });

    return Response.json(toCategoria(categoria), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json(
        { error: "Ya existe una categoría con ese nombre o enlace." },
        { status: 409 },
      );
    }
    console.error("POST /api/categorias", error);
    await writeLog("db", `Error al crear categoría: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: "/api/categorias",
    });
    return Response.json({ error: "No se pudo crear la categoría." }, { status: 500 });
  }
}
