import { validatePriceSet, priceSnapshot } from "@/lib/precios";
import { prisma } from '@/lib/prisma';
import { newProductoId, parseProducto } from '@/lib/productos';
import { toProducto, toProductoParaListado } from '@/lib/serialize';
import { canReadProductCost } from '@/lib/permisos';
import { getPermisos, requirePermission, requireSession } from '@/lib/dal';
import { writeLog } from '@/lib/logs';
import { aplicarMovimiento, bodegaPrincipal } from '@/lib/inventario';
import { guardarImagen } from "@/lib/almacen-fotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Un producto sin precio no puede publicarse: se avisa a quienes pueden
 * definir los precios (gerente/administrador) para que pongan el Valor 1.
 * Best-effort: nunca rompe el alta si falla.
 */
async function notificarProductoPendiente({ nombre, sku, actorEmail, productoId }) {
  try {
    const users = await prisma.usuario.findMany({ where: { activo: true }, select: { correo: true, rol: true } });
    const roles = new Set(["gerente", "administrador"]);
    const actor = (actorEmail || "").toLowerCase();
    const recipients = [...new Set(
      users.filter((user) => roles.has(user.rol)).map((user) => user.correo.toLowerCase()),
    )].filter((email) => email && email !== actor);
    if (!recipients.length) return;
    await prisma.notificacion.createMany({
      data: recipients.map((recipient) => ({
        recipient,
        title: "Producto pendiente de precio",
        message: `"${nombre}" (${sku || "sin SKU"}) quedó pendiente de revisión: falta el Valor 1 · Normal, obligatorio para publicarlo.`,
        type: "producto",
        ...(productoId ? { productoId } : {}),
      })),
    });
  } catch (error) {
    console.error("No se pudieron generar notificaciones de producto pendiente", error?.message);
  }
}

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria");
  const estado = searchParams.get("estado");
  // La búsqueda se acota en longitud para evitar consultas costosas o abusivas.
  const q = searchParams.get("q")?.trim().slice(0, 80) || "";
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  // Los productos dados de baja definitiva no vuelven a listarse.
  const where = { archivado: false };
  if (categoria) where.categoria = categoria;
  if (estado) where.estado = estado;
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { marca: { contains: q, mode: "insensitive" } },
      { codigoBarras: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const permisos = await getPermisos(guard.session);
    const productos = await prisma.producto.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true, nombre: true, sku: true, codigoBarras: true, categoria: true, marca: true,
        unidad: true, descripcion: true, precio: true, precioDescuento: true, precioMayorista: true, preciosUpdatedAt: true, preciosUpdatedBy: true, costo: canReadProductCost(permisos), stock: true,
        stockMinimo: true, ubicacion: true, garantia: true, peso: true, estado: true, foto: true, fotos: true, updatedAt: true,
      },
    });

    return Response.json(productos.map(producto => toProductoParaListado(producto, permisos)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("GET /api/productos", error?.message);
    return Response.json({ error: "No se pudieron obtener los productos." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("productos:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Sin permiso para precios (rol bodega) se permite el alta sin precio:
  // el producto queda pendiente de revisión y se notifica al gerente para
  // que defina el Valor 1. Con permiso, el precio sigue siendo obligatorio.
  const sinPrecios = !guard.permisos?.includes("precios:write");
  const { data, errors } = parseProducto(body, { precioOpcional: sinPrecios });
  if (sinPrecios) {
    // El servidor no acepta precios entrando de un rol que no puede setearlos.
    delete data.precio;
    delete data.precioDescuento;
    delete data.precioMayorista;
  }
  errors.push(...validatePriceSet(data));
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  // La imagen llega como data URL desde el editor. Se guarda como archivo y en
  // la columna queda solo su ruta: así la base no carga con megabytes de texto
  // que además viajarían en cada listado.
  let fotosGuardadas = {};
  try {
    if (data.foto) fotosGuardadas.foto = await guardarImagen({ carpeta: "productos", dataUrl: data.foto, base: data.sku || "producto" });
    if (Array.isArray(data.fotos) && data.fotos.length) {
      const galeria = [];
      for (const [indice, imagen] of data.fotos.entries()) {
        galeria.push(await guardarImagen({ carpeta: "productos", dataUrl: imagen, base: `${data.sku || "producto"}-${indice + 1}` }));
      }
      if (galeria.length) fotosGuardadas.fotos = galeria;
    }
  } catch (error) {
    return Response.json({ error: error.message || "No se pudo guardar la imagen." }, { status: 400 });
  }

  try {
    const { stock = 0, ...resto } = data;
    const producto = await prisma.$transaction(
      async (tx) => {
        // Sin precio no se publica: nace pendiente de revisión hasta que el
        // gerente defina el Valor 1.
        delete resto.estado;
        const creado = await tx.producto.create({
          data: {
            id: newProductoId(),
            ...resto,
            ...fotosGuardadas,
            stock: 0,
            // La columna "precio" es NOT NULL sin default: un producto sin
            // precio (bodega) nace con 0 y queda pendiente de revisión hasta
            // que gerente defina el Valor 1.
            precio: resto.precio ?? 0,
            estado: sinPrecios ? "pendiente" : "activo",
            ...(sinPrecios
              ? {}
              : { preciosUpdatedAt: new Date(), preciosUpdatedBy: guard.session?.correo ?? null }),
            createdBy: guard.session?.correo ?? null,
          },
        });
        if (!sinPrecios) {
          await tx.log.create({ data: { categoria: "panel", mensaje: `Precios iniciales: ${creado.nombre}`, actor: guard.session?.correo ?? null, ruta: `/api/precios/${creado.id}`, detalle: JSON.stringify({ antes: null, despues: priceSnapshot(creado) }) } });
        }
        // El stock inicial entra por kardex: así el producto nace con saldo
        // trazable en la bodega principal y no como un número suelto.
        if (Number(stock) > 0) {
          const bodega = await bodegaPrincipal(tx);
          await aplicarMovimiento(tx, {
            tipo: "ajuste",
            productoId: creado.id,
            bodegaId: bodega.id,
            cantidad: Number(stock),
            motivo: "Stock inicial del producto",
            referencia: "inicial",
            actor: guard.session?.correo ?? null,
          });
        }
        return tx.producto.findUnique({ where: { id: creado.id } });
      },
      { timeout: 20_000 },
    );
    await writeLog("panel", `Producto creado: ${producto.nombre} (${producto.sku})`, {
      actor: guard.session?.correo,
      ruta: "/api/productos",
      detalle: { id: producto.id, categoria: producto.categoria },
    });
    // Pendiente de revisión: avisar a gerente/administradores para que
    // definan el Valor 1 obligatorio y lo publiquen.
    if (sinPrecios) {
      await notificarProductoPendiente({
        nombre: producto.nombre,
        sku: producto.sku,
        actorEmail: guard.session?.correo ?? "",
        productoId: producto.id,
      });
    }
    return Response.json(toProducto(producto), { status: 201 });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
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
