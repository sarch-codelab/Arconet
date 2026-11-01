import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Filtros, orden y vistas de la página de categoría. Son piezas de cliente: se
// comprueba el contrato con la página y las reglas de accesibilidad que se
// rompen con facilidad al retocar el marcado.

const JS = "app/tienda/categoria/[slug]/category-products.js";
const FILTROS = "app/tienda/categoria/[slug]/category-filters.js";
const FILTROS_CSS = "app/tienda/categoria/[slug]/category-filters.module.css";
const TOOLBAR = "app/tienda/categoria/[slug]/category-toolbar.js";
const CSS = "app/tienda/categoria/[slug]/category-products.module.css";

const leer = (f) => readFileSync(f, "utf8");

describe("filtros de la página de categoría", () => {
  it("la página monta el panel de filtros y la barra de vistas", () => {
    const js = leer(JS);
    expect(js).toContain("<CategoryFilters");
    expect(js).toContain("<CategoryToolbar");
  });

  it("el rango de precio filtra por mínimo y máximo reales del producto", () => {
    const js = leer(JS);
    expect(js).toMatch(/precio\s*<\s*min/);
    expect(js).toMatch(/precio\s*>\s*max/);
    expect(js).toContain("rangoPrecio");
  });

  it("el buscador acepta nombre y SKU", () => {
    const js = leer(JS);
    const bloque = js.match(/const haystack = `([^`]+)`/)?.[1] || "";
    expect(bloque).toContain("product.nombre");
    expect(bloque).toContain("product.sku");
  });

  it("ofrece las tres vistas y recuerda la elegida", () => {
    const toolbar = leer(TOOLBAR);
    for (const vista of ["grande", "compacta", "lista"]) {
      expect(toolbar).toContain(`id: "${vista}"`);
    }
    expect(leer(JS)).toContain("arconet-catalogo-vista");
    expect(leer(CSS)).toContain(".vista_lista");
    expect(leer(CSS)).toContain(".vista_compacta");
  });

  it("las marcas del filtro salen solo de los productos de la línea", () => {
    const js = leer(JS);
    expect(js).toContain("marcasDisponibles");
    expect(js).toMatch(/categoryProducts\.forEach/);
  });

  it("avisa del resultado en una región que los lectores anuncian", () => {
    const filtros = leer(FILTROS);
    expect(filtros).toMatch(/role="status"/);
    expect(filtros).toContain('aria-live="polite"');
  });

  it("los controles tienen nombre accesible y estado anunciado", () => {
    const filtros = leer(FILTROS);
    // Botones de alternancia: aria-pressed, no solo color.
    expect(filtros).toMatch(/aria-pressed=\{disponibilidad/);
    expect(filtros).toMatch(/aria-pressed=\{orden/);
    // Secciones plegables: aria-expanded y el control que describen.
    expect(filtros).toContain("aria-expanded=");
    expect(filtros).toContain("aria-controls=");
    // El rango de precio lleva etiqueta visible, no solo placeholder.
    expect(filtros).toContain('htmlFor={id}');
  });

  it("el panel se apila en pantallas angostas", () => {
    const css = leer(FILTROS_CSS);
    expect(css).toMatch(/@media \(max-width: 980px\)/);
    expect(leer(CSS)).toMatch(/@media \(max-width: 980px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  });

  it("las transiciones nuevas corren siempre, también con las animaciones del sistema apagadas", () => {
    // Se quitaron los bloques @media (prefers-reduced-motion: reduce): dejaban
    // el sitio a medio pintar en los equipos con "Efectos de animación"
    // desactivado. Las animaciones son parte del diseño y van siempre.
    expect(leer(FILTROS_CSS)).not.toContain("prefers-reduced-motion");
    expect(leer(CSS)).not.toContain("prefers-reduced-motion");
    expect(leer(FILTROS_CSS)).toMatch(/transition(-duration)?:[^;]*\d+m?s/);
  });

  it("si los filtros dejan la lista vacía se puede volver sin salir del catálogo", () => {
    const js = leer(JS);
    expect(js).toContain("Quitar filtros");
    expect(js).toContain("Ningún producto cumple esos filtros");
  });
});
