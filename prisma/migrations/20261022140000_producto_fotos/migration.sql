-- Agregar campo fotos (array de imágenes) a Producto
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "fotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Comentario para documentar el campo
COMMENT ON COLUMN "Producto"."fotos" IS 'Galería de imágenes adicionales del producto (URLs o base64). La imagen principal sigue en "foto".';