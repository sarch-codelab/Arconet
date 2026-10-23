-- Permisos por sección: los roles controlan qué secciones del panel ve cada
-- usuario y qué acciones puede hacer en sus APIs.

-- El administrador conserva acceso total, incluidas las secciones nuevas
-- (roles, monitoreo, logs).
UPDATE "Rol"
SET "permisos" = ARRAY['trabajadores:read','trabajadores:write','trabajadores:delete','roles:read','roles:write','roles:delete','productos:read','productos:write','productos:delete','categorias:read','categorias:write','categorias:delete','sucursales:read','sucursales:write','sucursales:delete','clientes:read','clientes:write','clientes:delete','ordenes:read','ordenes:write','ordenes:delete','flota:read','monitoreo:read','logs:read','logs:delete','reportes:read','ajustes:read','ajustes:write'], "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'administrador';

-- El gerente ya podía eliminar productos, clientes y cotizaciones y gestionar
-- categorías; se agregan esos permisos para no quitarle acceso al aplicarlos.
UPDATE "Rol"
SET "permisos" = ARRAY(SELECT DISTINCT unnest("permisos" || ARRAY['productos:delete','categorias:read','categorias:write','categorias:delete','clientes:delete','ordenes:delete','flota:read'])),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'gerente';
