import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Regreso del bug: el listado de categoría quedó con `products` sin definir
// (se usaba en el useMemo de categoryProducts pero no se descomponía de
// useCatalogProducts) → ReferenceError en el navegador.
const JS = "app/tienda/categoria/[slug]/category-products.js";

const leer = (f) => readFileSync(f, "utf8");

describe("listado de productos de categoría", () => {
  it("descompone `products` de useCatalogProducts", () => {
    const js = leer(JS);
    expect(js).toMatch(/const \{ products, loading: productsLoading \} = useCatalogProducts\(\);/);
  });

  it("el filtro por categoría usa `products` y lo declara como dependencia", () => {
    const js = leer(JS);
    expect(js).toContain("products.filter(");
    // `products` debe figurar en el array de dependencias del useMemo.
    expect(js).toMatch(/\[products,\s*family,\s*slug\]/);
  });

  it("coincide por nombre o slug de categoría normalizados", () => {
    const js = leer(JS);
    expect(js).toContain("targetSlug");
    expect(js).toContain("normalizarCategoria(product.categoria)");
  });
});
