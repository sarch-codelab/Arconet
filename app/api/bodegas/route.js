import { prisma } from '@/lib/prisma";
import { newBodegaCodigo, parseBodega } from '@/lib/inventario";
import { requirePermission } from '@/lib/dal";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  try {
    const bodegas = await prisma.bodega.findMany({
      orderBy: [{ esPrincipal: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { stock: true } } },
    });
    return Response.json(
      bodegas.map((bodega) => ({
        id: bodega.id,
        nombre: bodega.nombre,
        codigo: bodega.codigo,
        sucursalId: bodega.sucursalId,
        direccion: bodega.direccion,
        esPrincipal: bodega.esPrincipal,
        estado: bodega.estado,
        productos: bodega._count.stock,
        createdAt: bodega.createdAt,
        updatedAt: bodega.updatedAt,
      }))
    );
  } catch (error) {
    console.error("GET /api/bodegas", error?.message);
    return Response.json({ error: "No se pudieron obtener las bodegas." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("inventario:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseBodega(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const codigo = data.codigo || newBodegaCodigo(data.nombre);
    const bodega = await prisma.bodega.create({
      data: { ...data, codigo, ...(data.esPrincipal ? {} : {}) },
    });
    if (bodega.esPrincipal) {
      await prisma.bodega.updateMany({
        where: { id: { not: bodega.id }, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }
    await writeLog("panel", `Bodega creada: ${bodega.nombre} (${bodega.codigo})`, {
      actor: guard.session.correo,
      ruta: "/api/bodegas",
      detalle: { bodegaId: bodega.id },
    });
    return Response.json(bodega, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe una bodega con ese código." }, { status: 409 });
    }
    if (error?.code === "P2003") {
      return Response.json({ error: "La sucursal indicada no existe." }, { status: 400 });
    }
    console.error("POST /api/bodegas", error);
    return Response.json({ error: "No se pudo crear la bodega." }, { status: 500 });
  }
}
