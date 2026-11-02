import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Los iconos del carrito se pintaban con el color equivocado por conflictos de
// especificidad y por overrides de tema oscuro que dejaban el trazo casi negro
// sobre fondo oscuro (1.02:1). Estos tests fijan el color correcto.
const CART = readFileSync("app/cart.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const GLOBALS = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const CATEGORIA = readFileSync("app/tienda/categoria/[slug]/category-products.module.css", "utf8");
const PRODUCTO = readFileSync("app/tienda/producto/[id]/product-page.module.css", "utf8");

describe("iconos del carrito y del catálogo", () => {
  it("el recuadro del icono no hereda el gris del subtítulo", () => {
    // .panelTitle span (0,1,1) le ganaba a .panelIcon (0,1,0).
    expect(CART).not.toMatch(/^\.panelTitle span\s*\{/m);
    expect(CART).toMatch(/\.panelTitle > div > span\s*\{/);
    expect(CART).toMatch(/\.panelIcon\s*\{[^}]*color: var\(--accent-ink\)/);
  });

  it("el botón de cotización mantiene el icono visible en tema oscuro", () => {
    const regla = CATEGORIA.match(/html\[data-theme="dark"\]\) \.headerCartIcon \{([^}]*)\}/)?.[1] || "";
    expect(regla).toContain("background: #ffffff");
    expect(regla).toContain("color: #0d1422");
    expect(regla).not.toContain("#101827");
  });

  it("el carrito de producto tiene etiqueta blanca e icono oscuro sobre su recuadro blanco", () => {
    const etiqueta = PRODUCTO.match(/\.headerAction > span \{([^}]*)\}/)?.[1] || "";
    const icono = PRODUCTO.match(/\.headerAction > \.headerCartIcon \{([^}]*)\}/)?.[1] || "";
    expect(etiqueta).toContain("color: #ffffff");
    expect(icono).toContain("background: #fff");
    expect(icono).toContain("color: #0d1422");
  });

  it("el contador del carrito usa un texto legible en tema oscuro", () => {
    expect(GLOBALS).toMatch(/\.cartBadge\s*\{[^}]*color: var\(--badge-ink, #fff\)/);
    const oscuro = GLOBALS.match(/html\[data-theme="dark"\] \{([^}]*)\}/)?.[1] || "";
    expect(oscuro).toContain("--badge-ink:");
  });

  it("el badge del conteo en las páginas está scoped y contenedor posicionado", () => {
    // El badge global se reemplazó por la clase del módulo en cada página:
    // sin ella, el círculo absoluto del badge se pegaba a otro lado.
    const catCss = CATEGORIA.match(/\.cartBadge\s*\{([^}]*)\}/)?.[1] || "";
    expect(catCss).toContain("background: #d92f2f");
    expect(catCss).toContain("position: absolute");
    expect(catCss).toContain("box-shadow: 0 0 0 2px var(--paper)");
    const prodCss = PRODUCTO.match(/\.cartBadge\s*\{([^}]*)\}/)?.[1] || "";
    expect(prodCss).toContain("background: #d92f2f");
  });
});
