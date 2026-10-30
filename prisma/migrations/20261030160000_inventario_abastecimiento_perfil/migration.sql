ALTER TABLE "Usuario" ADD COLUMN "temaPanel" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "OrdenCompra"
 ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'compra',
 ADD COLUMN "requeridoA" TEXT,
 ADD COLUMN "terminos" TEXT NOT NULL DEFAULT 'contado',
 ADD COLUMN "diasCredito" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "fechaVencimiento" TIMESTAMP(3),
 ADD COLUMN "facturaProveedor" TEXT,
 ADD COLUMN "envio" TEXT,
 ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'HNL',
 ADD COLUMN "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN "cotizacionOrigenId" TEXT;
ALTER TABLE "OrdenCompraItem" ADD COLUMN "impuestoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "OrdenCompra_cotizacionOrigenId_key" ON "OrdenCompra"("cotizacionOrigenId");
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_cotizacionOrigenId_fkey" FOREIGN KEY ("cotizacionOrigenId") REFERENCES "OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "RecepcionCompra" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "ordenCompraId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL,
 "huella" TEXT NOT NULL,
 "bodegaId" TEXT NOT NULL,
 "detalle" JSONB NOT NULL,
 "notas" TEXT,
 "actor" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RecepcionCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecepcionCompra_requestId_key" ON "RecepcionCompra"("requestId");
CREATE INDEX "RecepcionCompra_ordenCompraId_createdAt_idx" ON "RecepcionCompra"("ordenCompraId", "createdAt");
-- El rol conocido de Bodega no debe abrir Ventas por los permisos antiguos.
UPDATE "Rol" SET "permisos" = ARRAY(SELECT p FROM unnest("permisos") p WHERE p NOT LIKE 'ordenes:%' AND p NOT LIKE 'facturacion:%' AND p NOT LIKE 'precios:%' AND p NOT LIKE 'clientes:%' AND p NOT LIKE 'reportes:%' AND p NOT LIKE 'logs:%'),
 "descripcion" = 'Productos, abastecimiento, recepción y kardex. Resumen y registros de su área; sin Ventas ni reportes globales.', "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'bodega';
-- Conservar la recepción en roles que ya podían comprar Y mover inventario.
UPDATE "Rol" SET "permisos" = array_append("permisos", 'compras:receive'), "updatedAt" = CURRENT_TIMESTAMP
 WHERE 'compras:write' = ANY("permisos") AND 'inventario:write' = ANY("permisos") AND NOT('compras:receive' = ANY("permisos"));
