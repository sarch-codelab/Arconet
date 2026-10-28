import { prisma } from '@/lib/prisma";
import { parseCategoria } from '@/lib/categorias";
import { requirePermission } from '@/lib/dal";
import { writeLog } from '@/lib/logs";

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

export async function PATCH(request, { params }) {
  const guard = await requirePermission("categorias:write");
  if (guard.response) return guard.response;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseCategoria(body, { partial: true });
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  try {
    const existing = await prisma.categoria.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const categoria = await tx.categoria.update({ where: { id }, data });

      if (data.nombre && data.nombre !== existing.nombre) {
        await tx.producto.updateMany({
          where: { categoria: existing.nombre },
          data: { categoria: data.nombre },
        });
      }

      return categoria;
    });

    await writeLog("panel", `Categoría actualizada: ${updated.nombre}`, {
      actor: guard.session?.correo,
      ruta: `/api/categorias/${id}`,
      detalle: { campos: Object.keys(data) },
    });

    return Response.json(toCategoria(updated));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Categoría no encontrada." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json(
        { error: "Ya existe una categoría con ese nombre o enlace." },
        { status: 409 },
      );
    }
    console.error("PATCH /api/categorias/[id]", error);
    await writeLog("db", `Error al actualizar categoría ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/categorias/${id}`,
    });
    return Response.json({ error: "No se pudo actualizar la categoría." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("categorias:delete");
  if (guard.response) return guard.response;

  const { id } = await params;

  try {
    const categoria = await prisma.categoria.findUnique({ where: { id } });
    if (!categoria) {
      return Response.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    const productos = await prisma.producto.count({
      where: { categoria: categoria.nombre },
    });
    if (productos > 0) {
      return Response.json(
        {
          error: `No se puede eliminar: la categoría tiene ${productos} producto${productos === 1 ? "" : "s"}. Reasígnalos primero.`,
          productos,
        },
        { status: 409 },
      );
    }

    await prisma.categoria.delete({ where: { id } });

    await writeLog("panel", `Categoría eliminada: ${categoria.nombre}`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/categorias/${id}`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Categoría no encontrada." }, { status: 404 });
    }
    console.error("DELETE /api/categorias/[id]", error);
    await writeLog("db", `Error al eliminar categoría ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/categorias/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar la categoría." }, { status: 500 });
  }
}
