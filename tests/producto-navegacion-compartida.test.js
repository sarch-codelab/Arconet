import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PRODUCTO = "app/tienda/producto/[id]/product-page.js";
const PRODUCTO_CSS = "app/tienda/producto/[id]/product-page.module.css";
const CATEGORIA = "app/tienda/categoria/[slug]/category-products.js";
const NAVIGATION = "app/navigation-data.js";

const leer = (archivo) => readFileSync(archivo, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("navegación compartida entre categoría y producto", () => {
  it("ambas páginas usan el mismo dock flotante, estado activo y destinos", () => {
    const producto = leer(PRODUCTO);
    const categoria = leer(CATEGORIA);

    for (const [nombre, fuente] of [["producto", producto], ["categoría", categoria]]) {
      expect(fuente, nombre).toContain("<NavDock");
      expect(fuente, nombre).toContain('variant="scroll"');
      expect(fuente, nombre).toContain('visible={scrolledPastHeader}');
      expect(fuente, nombre).toContain('activeId="soluciones"');
      expect(fuente, nombre).toContain("navigation={STORE_NAVIGATION}");
    }

    expect(producto).toContain('import { STORE_NAVIGATION } from "../../../navigation-data"');
    expect(categoria).toContain('import { STORE_NAVIGATION } from "../../../navigation-data"');
    expect(leer(NAVIGATION)).toContain("export const STORE_NAVIGATION = NAVIGATION.map");
  });

  it("producto conserva el progreso de scroll y el carrito dentro del dock", () => {
    const producto = leer(PRODUCTO);
    const dock = producto.match(/<NavDock[\s\S]*?\n      \/>/)?.[0] || "";

    expect(dock).toContain("topbarRef={topbarRef}");
    expect(dock).toContain("cartAction={");
    expect(dock).toContain("onClick={openCart}");
    expect(dock).toContain("styles.headerCartIcon");
    expect(dock).toContain("styles.cartBadge");
    expect(producto).toContain('topbar.style.setProperty("--scroll-progress"');
    expect(producto).not.toContain("MobileSiteMenu");
    expect(producto).not.toContain("const NAVIGATION = [");
  });

  it("la navegación inicial ocupa espacio y las migas conservan su separación", () => {
    const css = sinComentarios(leer(PRODUCTO_CSS));
    const pagina = css.match(/\.page\s*\{([^}]*)\}/)?.[1] || "";
    const migas = css.match(/\.breadcrumb\s*\{([^}]*)\}/)?.[1] || "";

    expect(pagina).toContain("padding-top: 16px");
    expect(migas).toContain("padding: 20px");
    expect(css).toMatch(/@media \(max-width: 760px\)\s*\{\s*\.page\s*\{[^}]*padding-top: 16px/);
    expect(css).toMatch(/@media \(max-width: 420px\)\s*\{\s*\.page\s*\{[^}]*padding-top: 16px/);
    expect(css).toMatch(/@media \(max-width: 1180px\)[\s\S]*?\.headerCartLabel\s*\{\s*display: none;/);
  });
});
