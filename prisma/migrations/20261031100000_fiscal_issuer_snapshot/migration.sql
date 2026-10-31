-- Conservar los datos empresariales y del rango de las nuevas emisiones.
-- No inventar ni reescribir la autorización de documentos anteriores.
ALTER TABLE "DocumentoFiscal" ADD COLUMN "fiscalSnapshot" JSONB;

-- Reintentos del mismo borrador no crean otra factura ni descuentan stock dos veces.
ALTER TABLE "DocumentoFiscal" ADD COLUMN "emissionKey" TEXT, ADD COLUMN "emissionPayloadHash" TEXT;
CREATE UNIQUE INDEX "DocumentoFiscal_emissionKey_key" ON "DocumentoFiscal"("emissionKey");
