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
    const regla = CATEGORIA.match(/html\[data-theme="dark"\]\) \.headerAction span \{([^}]*)\}/)?.[1] || "";
    expect(regla).toContain("background: #ffffff");
    expect(regla).toContain("color: #0d1422");
    expect(regla).not.toContain("#101827");
  });

  it("el icono del carrito en la ficha de producto es blanco sobre el botón oscuro", () => {
    const regla = PRODUCTO.match(/\.headerAction > span \{([^}]*)\}/)?.[1] || "";
    expect(regla).toContain("color: #ffffff");
  });

  it("el contador del carrito usa un texto legible en tema oscuro", () => {
    expect(GLOBALS).toMatch(/\.cartBadge\s*\{[^}]*color: var\(--badge-ink, #fff\)/);
    const oscuro = GLOBALS.match(/html\[data-theme="dark"\] \{([^}]*)\}/)?.[1] || "";
    expect(oscuro).toContain("--badge-ink:");
  });
});
