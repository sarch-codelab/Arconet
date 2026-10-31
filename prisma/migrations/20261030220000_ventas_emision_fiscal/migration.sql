-- Nueva venta ahora emite directamente una factura. Actualizar sólo el rol
-- operativo Ventas que ya podía crear órdenes, sin inferir permisos fiscales
-- para técnicos, lectores, roles inactivos ni otros roles personalizados.
-- `emit` no autoriza CAI, anulaciones, notas fiscales ni edición de tarifas.
UPDATE "Rol"
SET "permisos" = "permisos" || ARRAY(
      SELECT permiso
      FROM unnest(ARRAY['facturacion:read', 'facturacion:emit']::TEXT[]) AS nuevos(permiso)
      WHERE NOT (permiso = ANY("Rol"."permisos"))
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'ventas'
  AND "estado" = 'activo'
  AND "permisos" @> ARRAY['ordenes:read', 'ordenes:write']::TEXT[]
  AND NOT ("permisos" @> ARRAY['facturacion:read', 'facturacion:emit']::TEXT[]);
