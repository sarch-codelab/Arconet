-- Campos comerciales y de inventario para Producto.
-- Idempotente: se puede aplicar varias veces sin romper la base existente.

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "costo" DECIMAL(12, 2);
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "stockMinimo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "ubicacion" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "peso" DECIMAL(10, 3);
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

COMMENT ON COLUMN "Producto"."descripcion" IS 'Descripción comercial larga que se muestra en el catálogo.';
COMMENT ON COLUMN "Producto"."costo" IS 'Costo de adquisición. Uso interno: nunca se expone en la API pública.';
COMMENT ON COLUMN "Producto"."stockMinimo" IS 'Punto de reorden para generar alertas de inventario bajo.';
COMMENT ON COLUMN "Producto"."ubicacion" IS 'Ubicación física en bodega (pasillo, estante, etc.).';
COMMENT ON COLUMN "Producto"."peso" IS 'Peso en kilogramos para cálculo de flete.';
COMMENT ON COLUMN "Producto"."createdBy" IS 'Correo del usuario que creó el registro.';
COMMENT ON COLUMN "Producto"."updatedBy" IS 'Correo del último usuario que modificó el registro.';

-- Índices de rendimiento para búsqueda y ordenamiento.
CREATE INDEX IF NOT EXISTS "Producto_marca_idx" ON "Producto" ("marca");
CREATE INDEX IF NOT EXISTS "Producto_precio_idx" ON "Producto" ("precio");
CREATE INDEX IF NOT EXISTS "Producto_stock_idx" ON "Producto" ("stock");
CREATE INDEX IF NOT EXISTS "Producto_createdAt_idx" ON "Producto" ("createdAt");

CREATE INDEX IF NOT EXISTS "Cliente_rtn_idx" ON "Cliente" ("rtn");
CREATE INDEX IF NOT EXISTS "Cliente_ciudad_idx" ON "Cliente" ("ciudad");
