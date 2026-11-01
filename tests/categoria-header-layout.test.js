import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La página de categoría tenía tres defectos de maquetación que se veían en
// producción: la nav salía flotando suelta a la derecha, el menú móvil rompía
// la retícula del header y el botón quedaba ilegible en tema oscuro.
const JS = "app/tienda/categoria/[slug]/category-products.js";
const CSS = "app/tienda/categoria/[slug]/category-products.module.css";

const leer = (f) => readFileSync(f, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("header de la página de categoría", () => {
  it("la navegación no lleva estilos inline que la saquen del header", () => {
    const js = leer(JS);
    const nav = js.match(/<nav className=\{styles\.nav\}[^>]*>/)?.[0] || "";
    expect(nav).toBeTruthy();
    expect(nav).not.toContain("position");
    expect(nav).not.toContain("style=");
    expect(js).not.toContain("position: \"fixed\", right");
  });

  it("el menú de la cabecera tiene varios destinos, no una etiqueta suelta", () => {
    const js = leer(JS);
    const bloque = js.match(/const NAVIGATION = \[([\s\S]*?)\];/)?.[1] || "";
    const enlaces = (bloque.match(/href:/g) || []).length;
    expect(enlaces).toBeGreaterThan(1);
  });

  it("el menú móvil queda fuera de la retícula para no empujar la nav", () => {
    const css = sinComentarios(leer(CSS));
    // Oculto por defecto y solo flotante en pantallas chicas.
    expect(css).toMatch(/\.header > div \{\s*display: none;?\s*\}/);
    const movil = css.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/g) || [];
    const reglaMenu = movil.find((b) => b.includes(".header > div"));
    expect(reglaMenu, "falta la regla del menú móvil en <=760px").toBeTruthy();
    expect(reglaMenu).toContain("position: fixed");
  });

  it("solo un breakpoint manda en el header (700px ya no lo contradice)", () => {
    const css = sinComentarios(leer(CSS));
    const bloques700 = css.match(/@media \(max-width: 700px\) \{([\s\S]*?)\n\}/g) || [];
    for (const bloque of bloques700) {
      expect(bloque, "el bloque de 700px no debe redefinir el header").not.toMatch(/\.header\s*\{/);
    }
  });

  it("el botón principal es legible en tema oscuro", () => {
    const css = sinComentarios(leer(CSS));
    const regla = css.match(/html\[data-theme="dark"\]\) \.primaryButton \{([^}]*)\}/)?.[1] || "";
    expect(regla).toContain("color:");
    // Texto oscuro sobre el azul claro (contraste 7.45:1 frente a 2.39:1 con blanco).
    expect(regla).toMatch(/color:\s*#101827/i);
  });
});
