import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Regreso del bug "la categoría no muestra los productos": en producción
// /api/catalogo devolvía 50 referencias y el HTML las contenía, pero la
// sección entera arrancaba en opacity: 0 y solo un IntersectionObserver con
// threshold 0.12 podía hacerla visible. Una sección más alta que el viewport
// nunca llega al 12 % de su propia área visible (y si un chunk falla, el
// observador nunca se crea), así que el usuario veía la página vacía.
const PAGE = "app/tienda/categoria/[slug]/page.js";
const JS = "app/tienda/categoria/[slug]/category-products.js";
const CSS = "app/tienda/categoria/[slug]/category-products.module.css";
const HOOK = "app/tienda/catalogo-products.js";

const leer = (f) => readFileSync(f, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("la categoría pinta los productos desde el servidor", () => {
  it("consulta los productos activos y los pasa como datos planos", () => {
    const page = leer(PAGE);
    expect(page).toContain("prisma.producto.findMany(");
    expect(page).toContain('estado: "activo", archivado: false');
    expect(page).toContain("productosIniciales={productosIniciales}");
    // Ni Decimal ni el registro de Prisma cruzan al componente cliente.
    expect(page).toContain("precio: Number(producto.precio)");
    expect(page).toContain('startsWith("data:")');
  });

  it("coincide por nombre y slug normalizados igual que el cliente", () => {
    const page = leer(PAGE);
    expect(page).toContain("normalizarCategoria(nombre)");
    expect(page).toContain("normalizarCategoria(slug)");
    expect(page).toContain("normalizarCategoria(producto.categoria)");
    // La base puede no tener la categoría: se usa el nombre del catálogo.
    expect(page).toContain("family?.category");
  });

  it("el hook conserva el listado inicial si /api/catalogo falla", () => {
    const hook = leer(HOOK);
    expect(hook).toContain("useCatalogProducts(productosIniciales = [])");
    expect(hook).toContain("useState(productosIniciales)");
    expect(hook).toContain('response.ok ? response.json() : null');
    expect(hook).not.toContain("setProducts([])");
  });
});

describe("el listado no depende de la hidratación para verse", () => {
  it("declara el prop de productos iniciales", () => {
    const js = leer(JS);
    expect(js).toContain("productosIniciales = []");
    expect(js).toContain("useCatalogProducts(productosIniciales)");
  });

  it("muestra tarjetas aunque el refresco siga en vuelo", () => {
    const js = leer(JS);
    expect(js).toContain("const esperandoProductos = productsLoading && filteredProducts.length === 0;");
    expect(js).toContain("{!esperandoProductos ? (");
    expect(js).toContain("{esperandoProductos ? (");
    expect(js).not.toContain("{productsLoading ? (");
  });

  it("la clase base del revelado es visible y el estado final también", () => {
    const css = sinComentarios(leer(CSS));
    const base = css.match(/\.reveal\s*\{([^}]*)\}/)?.[1] || "";
    expect(base).toMatch(/opacity:\s*1/);
    expect(base).not.toMatch(/opacity:\s*0/);
    const visible = css.match(/\.revealVisible\s*\{([^}]*)\}/)?.[1] || "";
    expect(visible).toMatch(/animation:\s*categoryRevealUp\s+600ms\s+ease\s+both/);
    const animacion = css.match(/@keyframes\s+categoryRevealUp\s*\{([\s\S]*?)\n\}/)?.[1] || "";
    expect(animacion).toMatch(/to\s*\{[^}]*opacity:\s*1/);
    expect(animacion).toMatch(/to\s*\{[^}]*transform:\s*translateY\(0\)/);
  });

  it("el observador revela con threshold 0 y tiene salida sin IntersectionObserver", () => {
    const js = leer(JS);
    expect(js).toContain('typeof IntersectionObserver === "undefined"');
    expect(js).toMatch(/typeof IntersectionObserver === "undefined"[\s\S]{0,200}revealVisible/);
    expect(js).toContain('{ threshold: 0, rootMargin: "0px 0px -6% 0px" }');
    expect(js).not.toContain("threshold: 0.12");
  });
});
