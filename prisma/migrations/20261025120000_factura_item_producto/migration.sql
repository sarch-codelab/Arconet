-- Cada línea de un documento fiscal puede apuntar a un producto del catálogo.
-- Es opcional: las líneas de concepto libre (servicios, ajustes) siguen
-- funcionando con NULL y no afectan el inventario.

ALTER TABLE "DocumentoFiscalItem" ADD COLUMN "productoId" TEXT;

CREATE INDEX "DocumentoFiscalItem_productoId_idx" ON "DocumentoFiscalItem"("productoId");

ALTER TABLE "DocumentoFiscalItem"
  ADD CONSTRAINT "DocumentoFiscalItem_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
