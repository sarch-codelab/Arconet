import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (f) => readFileSync(f, "utf8");

const CART = leer("app/cart-drawer.js");
const CATEGORIA = leer("app/tienda/categoria/[slug]/category-products.js");
const CATEGORIA_CSS = leer("app/tienda/categoria/[slug]/category-products.module.css");
const PRODUCTO = leer("app/tienda/producto/[id]/product-page.js");
const PRODUCTO_CSS = leer("app/tienda/producto/[id]/product-page.module.css");
const CATALOGO = leer("app/tienda/catalogo-experience.js");
const DETALLLE = leer("app/tienda/[slug]/product-detail.js");
const FOOTER = leer("app/footer.js");

describe("carrito y cotización de la tienda", () => {
  it("el drawer se llama Mi Carrito, no cotización", () => {
    expect(CART).toContain("<strong>Mi Carrito</strong>");
    expect(CART).toContain("aria-label=\"Mi Carrito\"");
    expect(CART).not.toContain("Tu cotización");
    expect(CART).not.toContain("Cerrar cotización");
  });

  it("el drawer tiene botón Generar cotización que pide el previo", () => {
    expect(CART).toContain("Generar cotización");
    expect(CART).toContain("generarCotizacion");
    expect(CART).toContain("/api/cotizaciones/previo");
  });

  it("los botones del carrito en las páginas dicen Carrito", () => {
    const re = /aria-label=\{`Carrito, \$\{cartCount/
    for (const [nombre, js] of [["catalogo", CATALOGO], ["producto", PRODUCTO], ["detalle", DETALLLE], ["categoría", CATEGORIA]]) {
      expect(js, nombre).toMatch(re);
    }
    expect(CATALOGO).toMatch(/Carrito\s*<\/button>/);
    expect(PRODUCTO).toMatch(/Carrito\s*<\/button>/);
    expect(CATEGORIA).toContain('className={styles.headerCartLabel}>Carrito</span>');
  });

  it("el badge del conteo es scoped y su contenedor está posicionado", () => {
    expect(CATEGORIA).toContain("styles.cartBadge");
    expect(CATALOGO).toContain("styles.cartBadge");
    expect(PRODUCTO).toContain("styles.cartBadge");
    expect(DETALLLE).toContain("styles.cartBadge");
    // En la categoría el badge estaba en un span sin posicionar: el círculo
    // absoluto se pegaba al header. Ahora el contenedor es position:relative.
    expect(CATEGORIA_CSS).toMatch(/\.headerCartIcon\s*\{[^}]*position: relative/);
  });

  it("el resumen de la categoría no se repite cuando la descripción es la misma", () => {
    expect(CATEGORIA).toMatch(/\{family.summary && family.summary !== family.description \?/);
    expect(CATEGORIA).toMatch(/summary: staticFamily\?.summary \|| categoryDescription/);
  });

  it("el botón agotado se pone rojo", () => {
    expect(CATEGORIA).toMatch(/soldOut \? styles.agotado : ""/);
    expect(CATEGORIA_CSS).toMatch(/\.familyCartButton.agotado\s*\{[^}]*background: #c62828/);
    expect(PRODUCTO).toMatch(/soldOut \? styles.agotado : ""/);
    expect(PRODUCTO_CSS).toMatch(/\.primary.agotado\s*\{[^}]*background: #c62828/);
  });

  it("las redes sociales del footer son solo Instagram", () => {
    const social = FOOTER.match(/const SOCIAL = \[([\s\S]*?)\];/)?.[1] || "";
    expect(social).toContain("arcolab_s.a");
    expect(social).not.toContain("linkedin.com");
    expect(social).not.toContain("facebook.com");
  });
});
