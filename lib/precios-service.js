import {
  PRICE_FIELDS,
  priceAt,
  priceLevel,
  priceSnapshot,
  validatePriceSet,
} from "./precios";
export function priceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Bloqueo por fila + versión evita que dos administradores pierdan cambios.
export async function updateProductPrices(
  tx,
  id,
  changes,
  { actor, version, extra = {} } = {},
) {
  if (
    version !== undefined &&
    version !== null &&
    (typeof version !== "string" || Number.isNaN(Date.parse(version)))
  )
    throw priceError("Versión de precios inválida.");
  await tx.$executeRaw`SELECT id FROM "Producto" WHERE id = ${id} FOR UPDATE`;
  const before = await tx.producto.findUnique({ where: { id } });
  if (!before || before.archivado)
    throw priceError("Producto no encontrado.", 404);
  if (
    version !== undefined &&
    (before.preciosUpdatedAt?.toISOString() || null) !== version
  )
    throw priceError(
      "Los precios cambiaron desde que abriste la ficha. Actualiza antes de guardar.",
      409,
    );
  const errors = validatePriceSet({ ...priceSnapshot(before), ...changes });
  if (errors.length) throw priceError(errors[0]);
  const changed = PRICE_FIELDS.some(
    (field) =>
      Object.hasOwn(changes, field) &&
      (before[field] == null ? null : Number(before[field])) !== changes[field],
  );
  const after = await tx.producto.update({
    where: { id },
    data: {
      ...extra,
      ...changes,
      ...(changed
        ? {
            preciosUpdatedAt: new Date(
              Math.max(
                Date.now(),
                (before.preciosUpdatedAt?.getTime() || 0) + 1,
              ),
            ),
            preciosUpdatedBy: actor || null,
            updatedBy: actor || null,
          }
        : {}),
    },
  });
  if (changed)
    await tx.log.create({
      data: {
        categoria: "panel",
        mensaje: `Precios actualizados: ${after.nombre} (${after.sku})`,
        actor: actor || null,
        ruta: `/api/precios/${id}`,
        detalle: JSON.stringify({
          antes: priceSnapshot(before),
          despues: priceSnapshot(after),
        }),
      },
    });
  return after;
}

// El cliente elige una tarifa, nunca su importe. Las líneas guardadas mantienen
// su precio acordado al editar cantidades/notas; actualizarlo exige una acción explícita.
export async function resolveCatalogPrices(
  tx,
  items,
  { previous = [], editing = false, fiscal = false, canDiscount = false } = {},
) {
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        !item ||
        Array.isArray(item) ||
        typeof item !== "object" ||
        (item.productoId != null &&
          (typeof item.productoId !== "string" ||
            item.productoId.length > 100)),
    )
  )
    throw priceError("Líneas de productos inválidas.");
  const ids = [
    ...new Set(
      items.filter((item) => item.productoId).map((item) => item.productoId),
    ),
  ];
  const products = ids.length
    ? await tx.producto.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          nombre: true,
          precio: true,
          precioDescuento: true,
          precioMayorista: true,
          archivado: true,
          estado: true,
        },
      })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.map((raw, index) => {
    const { itemOriginalId, actualizarPrecio, ...item } = raw;
    if (!item.productoId)
      return { ...item, nivelPrecio: null, precioBase: null };
    const level = item.nivelPrecio || "normal";
    if (!priceLevel(level)) throw priceError("Tarifa de precio inválida.");
    if (fiscal && Number(item.descuento || 0) > 0 && !canDiscount)
      throw priceError(
        "Para descuentos adicionales se necesita permiso de modificar precios.",
        403,
      );
    let saved = itemOriginalId
      ? previous.find((line) => line.id === itemOriginalId)
      : null;
    if (editing && itemOriginalId && !saved)
      throw priceError(
        "El documento cambió desde que abriste el formulario. Recarga antes de guardar.",
        409,
      );
    // Compatibilidad con formularios anteriores que todavía no enviaban ids/tarifa.
    if (
      !saved &&
      !itemOriginalId &&
      !raw.nivelPrecio &&
      previous[index]?.productoId === item.productoId &&
      Number(previous[index].precio) === Number(item.precio)
    )
      saved = previous[index];
    if (
      saved &&
      saved.productoId === item.productoId &&
      (saved.nivelPrecio || "normal") === level &&
      !actualizarPrecio
    ) {
      return {
        ...item,
        precio: Number(saved.precio),
        nivelPrecio: saved.nivelPrecio || null,
        precioBase: saved.precioBase == null ? null : Number(saved.precioBase),
      };
    }
    const product = byId.get(item.productoId);
    if (!product || product.archivado || product.estado !== "activo")
      throw priceError("El producto no está disponible para una nueva tarifa.");
    const price = priceAt(product, level);
    if (price == null)
      throw priceError(
        `${priceLevel(level).label} no está configurado para ${product.nombre}.`,
      );
    return {
      ...item,
      precio: price,
      nivelPrecio: level,
      precioBase: Number(product.precio),
      ...(fiscal
        ? { descripcion: product.nombre }
        : { nombre: product.nombre }),
    };
  });
}
