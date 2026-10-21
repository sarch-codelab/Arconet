import { prisma } from "../../../lib/prisma";
import { newProductoId, parseProducto } from "../../../lib/productos";
import { toProducto } from "../../../lib/serialize";
import { requireSession, requireRole } from "../../../lib/dal";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria");
  const estado = searchParams.get("estado");
  const q = searchParams.get("q");
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {};
  if (categoria) where.categoria = categoria;
  if (estado) where.estado = estado;
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { marca: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const productos = await prisma.producto.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true, nombre: true, sku: true, categoria: true, marca: true,
        unidad: true, precio: true, stock: true, estado: true, foto: true, updatedAt: true,
      },
    });

    return Response.json(productos.map(toProducto));
  } catch (error) {
    console.error("GET /api/productos", error?.message);
    return Response.json({ error: "No se pudieron obtener los productos." }, { status: 500 });
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

  const { data, errors } = parseProducto(body);
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  try {
    const producto = await prisma.producto.create({
      data: { id: newProductoId(), ...data },
    });
    await writeLog("panel", `Producto creado: ${producto.nombre} (${producto.sku})`, {
      actor: guard.session?.correo,
      ruta: "/api/productos",
      detalle: { id: producto.id, categoria: producto.categoria },
    });
    return Response.json(toProducto(producto), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un producto con ese SKU." }, { status: 409 });
    }
    console.error("POST /api/productos", error);
    await writeLog("db", `Error al crear producto: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: "/api/productos",
    });
    return Response.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }
}
