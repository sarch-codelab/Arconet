-- Compatibilidad para bases creadas antes de Compras, Inventario y la venta
-- fiscal directa. Es aditiva: conserva personalizaciones y no reactiva roles.
UPDATE "Rol"
SET "permisos" = ARRAY(
  SELECT DISTINCT unnest("permisos" || ARRAY[
    'inventario:read',
    'inventario:write',
    'facturacion:read',
    'facturacion:write'
  ])
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'gerente' AND "estado" = 'activo';

-- Bodega necesita operar existencias, abastecimiento y recepciones. No se le
-- agregan permisos de Ventas, clientes, precios ni facturación.
UPDATE "Rol"
SET "permisos" = ARRAY(
  SELECT DISTINCT unnest("permisos" || ARRAY[
    'inventario:read',
    'inventario:write',
    'inventario:delete',
    'compras:read',
    'compras:write',
    'compras:receive'
  ])
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'bodega' AND "estado" = 'activo';
