import { PRICE_FIELDS, hasPriceChanges } from "@/lib/precios";
import { updateProductPrices } from "@/lib/precios-service";
import { prisma } from '@/lib/prisma';
import { parseProducto } from '@/lib/productos';
import { toProducto, toProductoForRead } from '@/lib/serialize';
import { getPermisos, requirePermission, requireSession } from '@/lib/dal';
import { writeLog } from '@/lib/logs';
import { aplicarMovimiento, bodegaPrincipal, sincronizarStockInicial } from '@/lib/inventario';
import { borrarImagen, guardarImagen } from "@/lib/almacen-fotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  const permisos = await getPermisos(guard.session);
  return Response.json(toProductoForRead(producto, permisos), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("productos:write");
  if (guard.response) return guard.response;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (hasPriceChanges(body) && !guard.permisos?.includes("precios:write")) return Response.json({ error: "Se necesita permiso de modificar precios." }, { status: 403 });
  const { data, errors } = parseProducto(body, { partial: true });
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  // El stock editable se traduce a un ajuste de kardex: nunca se escribe el
  // total a mano, porque la suma de bodegas es la fuente de verdad.
  const { stock, ...resto } = data;

  // Las imágenes nuevas se escriben en disco y en la columna va su ruta. La
  // anterior se borra, pero solo si era un archivo nuestro y cambió.
  let anteriores = [];
  try {
    if (Object.hasOwn(resto, "foto") || Object.hasOwn(resto, "fotos")) {
      // Las imágenes que tenía antes: esas son las que hay que borrar del disco
      // cuando se reemplazan. Guardar el valor entrante no serviría (es el
      // data URL nuevo, que no es un archivo).
      const previo = await prisma.producto.findUnique({ where: { id }, select: { foto: true, fotos: true } });
      anteriores = [previo?.foto, ...(previo?.fotos || [])].filter(Boolean);
    }
    if (typeof resto.foto === "string" && resto.foto) {
      resto.foto = await guardarImagen({ carpeta: "productos", dataUrl: resto.foto, base: resto.sku || id });
    }
    if (Array.isArray(resto.fotos) && resto.fotos.length) {
      const galeria = [];
      for (const [indice, imagen] of resto.fotos.entries()) {
        galeria.push(await guardarImagen({ carpeta: "productos", dataUrl: imagen, base: `${resto.sku || id}-${indice + 1}` }));
      }
      if (galeria.length) resto.fotos = galeria;
    }
  } catch (error) {
    return Response.json({ error: error.message || "No se pudo guardar la imagen." }, { status: 400 });
  }

  try {
    const producto = await prisma.$transaction(
      async (tx) => {
        const actual = await tx.producto.findUnique({
          where: { id },
          select: { id: true, stock: true, estado: true },
        });
        if (!actual) {
          const error = new Error("Producto no encontrado.");
          error.status = 404;
          throw error;
        }

        const save = () => {
          if (!hasPriceChanges(resto)) return tx.producto.update({ where: { id }, data: { ...resto, updatedBy: guard.session?.correo ?? null } });
          const prices = Object.fromEntries(PRICE_FIELDS.filter(field => Object.hasOwn(resto, field)).map(field => [field, resto[field]]));
          const extra = Object.fromEntries(Object.entries(resto).filter(([field]) => !PRICE_FIELDS.includes(field)));
          return updateProductPrices(tx, id, prices, { actor: guard.session?.correo, version: body.preciosVersion, extra: { ...extra, updatedBy: guard.session?.correo ?? null } });
        };
        // Un producto pendiente que recibe su Valor 1 se publica: al guardar
        // pasa a activo y aparece en la tienda.
        const guardar = async () => {
          const guardado = await save();
          if (actual.estado === "pendiente" && hasPriceChanges(resto) && resto.precio != null && resto.precio !== "") {
            return tx.producto.update({ where: { id }, data: { estado: "activo" } });
          }
          return guardado;
        };
        if (stock === undefined) return guardar();

        if (Number(stock) !== actual.stock) {
          // Si el producto venía de antes de existir bodegas, primero se
          // registra su saldo inicial y después el ajuste pedido.
          const filas = await tx.productoStock.count({ where: { productoId: id } });
          if (!filas && actual.stock > 0) {
            await sincronizarStockInicial(tx, { actor: guard.session?.correo ?? null });
          }
          const bodega = await bodegaPrincipal(tx);
          await aplicarMovimiento(tx, {
            tipo: "ajuste",
            productoId: id,
            bodegaId: bodega.id,
            cantidad: Number(stock) - actual.stock,
            motivo: "Ajuste desde la ficha del producto",
            referencia: "ajuste-manual",
            actor: guard.session?.correo ?? null,
          });
        }

        return guardar();
      },
      { timeout: 20_000 },
    );

    // Solo se borran los archivos que ya no usa el producto y que viven en
    // nuestro almacén: las rutas de /catalogo y las URL externas no se tocan.
    const vigentes = new Set([producto.foto, ...(producto.fotos || [])].filter(Boolean));
    const aBorrar = [...new Set(anteriores)].filter((ruta) => ruta && !vigentes.has(ruta));
    await Promise.all(aBorrar.map(borrarImagen));

    await writeLog("panel", `Producto actualizado: ${producto.nombre} (${producto.sku})`, {
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
      detalle: { campos: Object.keys(data) },
    });
    return Response.json(toProducto(producto));
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un producto con ese SKU." }, { status: 409 });
    }
    console.error("PATCH /api/productos/[id]", error);
    await writeLog("db", `Error al actualizar producto ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("productos:delete");
  if (guard.response) return guard.response;
  const { id } = await params;

  try {
    const producto = await prisma.producto.findUnique({
      where: { id },
      select: { id: true, nombre: true, sku: true, foto: true, fotos: true },
    });
    if (!producto) {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    // Si el producto ya tiene historial (kardex, órdenes o facturas) borrarlo
    // rompería la trazabilidad contable. En ese caso se archiva: desaparece de
    // todos los listados y del catálogo, pero su historial queda intacto.
    const [movimientos, enOrdenes, enFacturas] = await Promise.all([
      prisma.movimientoKardex.count({ where: { productoId: id } }),
      prisma.ordenItem.count({ where: { productoId: id } }),
      prisma.documentoFiscalItem.count({ where: { productoId: id } }),
    ]);

    if (movimientos || enOrdenes || enFacturas) {
      await prisma.producto.update({
        where: { id },
        data: {
          archivado: true,
          archivadoAt: new Date(),
          estado: "inactivo",
          updatedBy: guard.session?.correo ?? null,
        },
      });
      await writeLog("panel", `Producto archivado (tenía historial): ${producto.nombre} (${producto.sku})`, {
        nivel: "warn",
        actor: guard.session?.correo,
        ruta: `/api/productos/${id}`,
        detalle: { movimientos, enOrdenes, enFacturas },
      });
      return Response.json({ ok: true, archivado: true });
    }

    await prisma.producto.delete({ where: { id } });
    // Sus fotos ya no las usa nadie: se borran del almacén para no dejarlas
    // ocupando disco para siempre.
    await Promise.all([producto.foto, ...(producto.fotos || [])].filter(Boolean).map(borrarImagen));
    await writeLog("panel", `Producto eliminado: ${producto.nombre} (${producto.sku})`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ ok: true, archivado: false });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/productos/[id]", error);
    await writeLog("db", `Error al eliminar producto ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }
}
