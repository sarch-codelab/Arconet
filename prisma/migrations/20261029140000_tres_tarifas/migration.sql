-- La tarifa original y todos los importes históricos se conservan.
ALTER TABLE "Producto" ADD COLUMN "precioDescuento" DECIMAL(12,2), ADD COLUMN "precioMayorista" DECIMAL(12,2), ADD COLUMN "preciosUpdatedAt" TIMESTAMP(3), ADD COLUMN "preciosUpdatedBy" TEXT;
ALTER TABLE "OrdenItem" ADD COLUMN "nivelPrecio" TEXT, ADD COLUMN "precioBase" DECIMAL(12,2);
ALTER TABLE "DocumentoFiscalItem" ADD COLUMN "nivelPrecio" TEXT, ADD COLUMN "precioBase" DECIMAL(12,2);
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tarifas_validas" CHECK (("precioDescuento" IS NULL OR ("precioDescuento" > 0 AND "precioDescuento" <= "precio")) AND ("precioMayorista" IS NULL OR ("precioMayorista" > 0 AND "precioMayorista" <= "precio")));
-- Compatibilidad de roles existentes: leer catálogo/comercial permite ver tarifas;
-- editar productos ya permitía cambiar su precio. Nuevos roles son explícitos.
UPDATE "Rol" SET permisos = array_append(permisos, 'precios:read') WHERE NOT ('precios:read' = ANY(permisos)) AND (permisos && ARRAY['productos:read','productos:write','ordenes:read','facturacion:read']::TEXT[]);
UPDATE "Rol" SET permisos = array_append(permisos, 'precios:write') WHERE NOT ('precios:write' = ANY(permisos)) AND 'productos:write' = ANY(permisos);
