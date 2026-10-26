-- Código de barras del fabricante (EAN/UPC) para escanear con la cámara al
-- dar de alta o al buscar el producto. Es opcional porque no todo el
-- inventario de Arconet trae código impreso.
ALTER TABLE "Producto" ADD COLUMN "codigoBarras" TEXT;

-- Baja definitiva del producto sin destruir su historial (kardex, facturas,
-- órdenes de compra). Se oculta de todos los listados.
ALTER TABLE "Producto" ADD COLUMN "archivado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Producto" ADD COLUMN "archivadoAt" TIMESTAMP(3);

CREATE INDEX "Producto_codigoBarras_idx" ON "Producto"("codigoBarras");
CREATE INDEX "Producto_archivado_idx" ON "Producto"("archivado");
