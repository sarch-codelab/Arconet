-- Identificadores internos cortos y estables para el listado comercial.
-- No sustituyen el CAI, la serie ni el correlativo fiscal autorizado.
ALTER TABLE "Orden" ADD COLUMN "numero" TEXT;
ALTER TABLE "DocumentoFiscal" ADD COLUMN "numero" TEXT;

CREATE SEQUENCE "documento_cotizacion_seq"
  AS bigint MINVALUE 0 START WITH 0 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE "documento_factura_seq"
  AS bigint MINVALUE 0 START WITH 0 INCREMENT BY 1 NO CYCLE;

-- Los históricos conservan un orden determinista. Solo las facturas fiscales
-- consumen fac-N: una venta comercial antigua no altera esa numeración.
WITH "numeradas" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "fecha", "createdAt", "id") - 1 AS "consecutivo"
  FROM "Orden"
  WHERE "tipo" = 'cotizacion'
)
UPDATE "Orden" AS "orden"
SET "numero" = 'cot-' || "numeradas"."consecutivo"::text
FROM "numeradas"
WHERE "orden"."id" = "numeradas"."id";

WITH "numeradas" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "fecha", "createdAt", "id") - 1 AS "consecutivo"
  FROM "DocumentoFiscal"
  WHERE "tipo" = 'factura'
)
UPDATE "DocumentoFiscal" AS "documento"
SET "numero" = 'fac-' || "numeradas"."consecutivo"::text
FROM "numeradas"
WHERE "documento"."id" = "numeradas"."id";

SELECT setval(
  'documento_cotizacion_seq',
  (SELECT COUNT(*) FROM "Orden" WHERE "tipo" = 'cotizacion'),
  false
);
SELECT setval(
  'documento_factura_seq',
  (SELECT COUNT(*) FROM "DocumentoFiscal" WHERE "tipo" = 'factura'),
  false
);

CREATE UNIQUE INDEX "Orden_numero_key" ON "Orden"("numero");
CREATE UNIQUE INDEX "DocumentoFiscal_numero_key" ON "DocumentoFiscal"("numero");

-- Toda entrada nueva queda numerada en el servidor, incluso semillas o altas
-- del portal. El número se asigna una sola vez y no cambia al editar la orden.
CREATE OR REPLACE FUNCTION "asignar_numero_documento"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."numero" IS NULL THEN
    IF NEW."tipo" = 'cotizacion' THEN
      NEW."numero" := 'cot-' || nextval('documento_cotizacion_seq')::text;
    ELSIF NEW."tipo" = 'factura' THEN
      NEW."numero" := 'fac-' || nextval('documento_factura_seq')::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Orden_numero_documento_before_insert"
BEFORE INSERT ON "Orden"
FOR EACH ROW EXECUTE FUNCTION "asignar_numero_documento"();

CREATE TRIGGER "DocumentoFiscal_numero_documento_before_insert"
BEFORE INSERT ON "DocumentoFiscal"
FOR EACH ROW EXECUTE FUNCTION "asignar_numero_documento"();

COMMENT ON COLUMN "Orden"."numero" IS 'Código interno legible cot-N para cotizaciones; no es un correlativo fiscal.';
COMMENT ON COLUMN "DocumentoFiscal"."numero" IS 'Código interno legible fac-N; no sustituye el correlativo fiscal autorizado.';
