-- Database performance indexes
CREATE INDEX IF NOT EXISTS "Trabajador_sucursalId_idx" ON "Trabajador" ("sucursalId");
CREATE INDEX IF NOT EXISTS "Trabajador_rol_idx" ON "Trabajador" ("rol");
CREATE INDEX IF NOT EXISTS "Trabajador_estado_idx" ON "Trabajador" ("estado");
CREATE INDEX IF NOT EXISTS "Trabajador_nombre_idx" ON "Trabajador" ("nombre");

CREATE INDEX IF NOT EXISTS "Usuario_sucursalId_idx" ON "Usuario" ("sucursalId");
CREATE INDEX IF NOT EXISTS "Usuario_rol_idx" ON "Usuario" ("rol");

CREATE INDEX IF NOT EXISTS "Producto_categoria_idx" ON "Producto" ("categoria");
CREATE INDEX IF NOT EXISTS "Producto_estado_idx" ON "Producto" ("estado");
CREATE INDEX IF NOT EXISTS "Producto_updatedAt_idx" ON "Producto" ("updatedAt");
CREATE INDEX IF NOT EXISTS "Producto_nombre_idx" ON "Producto" ("nombre");

CREATE INDEX IF NOT EXISTS "Cliente_estado_idx" ON "Cliente" ("estado");
CREATE INDEX IF NOT EXISTS "Cliente_fechaRegistro_idx" ON "Cliente" ("fechaRegistro");
CREATE INDEX IF NOT EXISTS "Cliente_nombre_idx" ON "Cliente" ("nombre");

CREATE INDEX IF NOT EXISTS "Orden_clienteId_idx" ON "Orden" ("clienteId");
CREATE INDEX IF NOT EXISTS "Orden_tipo_idx" ON "Orden" ("tipo");
CREATE INDEX IF NOT EXISTS "Orden_estado_idx" ON "Orden" ("estado");
CREATE INDEX IF NOT EXISTS "Orden_fecha_idx" ON "Orden" ("fecha");

CREATE INDEX IF NOT EXISTS "OrdenItem_ordenId_idx" ON "OrdenItem" ("ordenId");
CREATE INDEX IF NOT EXISTS "OrdenItem_productoId_idx" ON "OrdenItem" ("productoId");
