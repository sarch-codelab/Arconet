-- Otorga consulta de Ajustes al rol gerente existente sin alterar sus demás
-- permisos ni cambiar su estado. No se añade escritura ni se reactivan roles.
UPDATE "Rol"
SET "permisos" = array_append("permisos", 'ajustes:read'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'gerente'
  AND NOT ('ajustes:read' = ANY("permisos"));

-- Actualiza solo descripciones originales conocidas; no toca las editadas.
UPDATE "Rol"
SET "descripcion" = 'Gestión operativa y consulta de Ajustes sin edición ni logs globales.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'gerente'
  AND "descripcion" IN (
    'Gestión operativa: personal, catálogo, inventario, clientes, ventas y reportes. Sin ajustes de sistema ni logs globales.',
    'Gestión operativa: trabajadores, productos, sucursales, clientes, órdenes y reportes. Sin acceso a ajustes de sistema ni logs.'
  );
