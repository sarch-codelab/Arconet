-- Roles administrables del sistema
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "permisos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");
CREATE UNIQUE INDEX "Rol_slug_key" ON "Rol"("slug");
CREATE INDEX "Rol_estado_idx" ON "Rol"("estado");

INSERT INTO "Rol" ("id", "nombre", "slug", "descripcion", "permisos", "estado", "updatedAt")
VALUES
    ('rol-admin', 'Administrador', 'administrador', 'Acceso total al sistema: gestión de usuarios, configuración, reportes y todas las secciones.', ARRAY['trabajadores:read','trabajadores:write','trabajadores:delete','productos:read','productos:write','productos:delete','categorias:read','categorias:write','categorias:delete','sucursales:read','sucursales:write','sucursales:delete','clientes:read','clientes:write','clientes:delete','ordenes:read','ordenes:write','ordenes:delete','reportes:read','ajustes:read','ajustes:write','logs:read','flota:read','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP),
    ('rol-gerente', 'Gerente', 'gerente', 'Gestión operativa: trabajadores, productos, sucursales, clientes, órdenes y reportes. Sin acceso a ajustes de sistema ni logs.', ARRAY['trabajadores:read','trabajadores:write','productos:read','productos:write','sucursales:read','sucursales:write','clientes:read','clientes:write','ordenes:read','ordenes:write','reportes:read','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP),
    ('rol-tecnico', 'Técnico', 'tecnico', 'Acceso técnico: catálogo de productos, órdenes asignadas, perfil propio. Sin gestión de personal ni configuración.', ARRAY['productos:read','ordenes:read','ordenes:write','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP),
    ('rol-ventas', 'Ventas', 'ventas', 'Gestión comercial: clientes, órdenes, catálogo de productos, reportes de ventas. Sin acceso a personal ni inventario.', ARRAY['productos:read','clientes:read','clientes:write','ordenes:read','ordenes:write','reportes:read','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP),
    ('rol-bodega', 'Bodega', 'bodega', 'Control de inventario: productos, stock, órdenes de preparación. Sin acceso a clientes ni configuración.', ARRAY['productos:read','productos:write','ordenes:read','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;