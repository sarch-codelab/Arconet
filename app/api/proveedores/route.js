import { prisma } from "../../../lib/prisma";
import { parseProveedor } from "../../../lib/inventario";
import { requirePermission } from "../../../lib/dal";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const estado = searchParams.get("estado");
  const where = {};
  if (estado) where.estado = estado;
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { rtn: { contains: q, mode: "insensitive" } },
      { contacto: { contains: q, mode: "insensitive" } },
    ];
  }
  try {
    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      include: { _count: { select: { ordenes: true } } },
    });
    return Response.json(
      proveedores.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        rtn: p.rtn,
        contacto: p.contacto,
        telefono: p.telefono,
        email: p.email,
        direccion: p.direccion,
        notas: p.notas,
        estado: p.estado,
        ordenes: p._count.ordenes,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error("GET /api/proveedores", error?.message);
    return Response.json({ error: "No se pudieron obtener los proveedores." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("compras:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const { data, errors } = parseProveedor(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });
  try {
    const proveedor = await prisma.proveedor.create({ data });
    await writeLog("panel", `Proveedor creado: ${proveedor.nombre}`, {
      actor: guard.session.correo,
      ruta: "/api/proveedores",
      detalle: { proveedorId: proveedor.id },
    });
    return Response.json(proveedor, { status: 201 });
  } catch (error) {
    console.error("POST /api/proveedores", error);
    return Response.json({ error: "No se pudo crear el proveedor." }, { status: 500 });
  }
}
