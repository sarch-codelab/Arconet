-- Garantía comercial por producto: se muestra junto a la marca en la ficha.
-- Nula significa "sin garantía declarada", que la ficha no inventa.
ALTER TABLE "Producto" ADD COLUMN "garantia" TEXT;
