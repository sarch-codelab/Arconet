-- Colección adicional en Notificacion: el aviso "producto pendiente de precio"
-- guarda el id del producto para que el clic abra su resumen y defina el Valor 1.
ALTER TABLE "Notificacion" ADD COLUMN "productoId" TEXT;
CREATE INDEX "Notificacion_productoId_idx" ON "Notificacion" ("productoId");
