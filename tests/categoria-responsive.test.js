import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/tienda/categoria/[slug]/category-products.module.css", "utf8");
const js = readFileSync("app/tienda/categoria/[slug]/category-products.js", "utf8");
const rule = name => css.match(new RegExp(`\\.${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] || "";

describe("categorías adaptables a pantalla", () => {
  it("empieza directamente con el listado, sin portada descriptiva", () => {
    expect(js).not.toContain('className={styles.hero}');
    expect(js).not.toContain('className={styles.heroVisual}');
    expect(js).toContain('<h1>Productos disponibles</h1>');
    expect(rule("productsHeader h1")).toContain("font-size: clamp(24px, 4vw, 32px)");
    expect(rule("breadcrumb span")).toContain("overflow-wrap: anywhere");
  });
  it("mantiene una cuadrícula adaptable para el listado", () => {
    expect(css).toContain('@media (max-width: 700px)');
    expect(css).toMatch(/\.productsGrid\s*\{[^}]*grid-template-columns: 1fr/);
  });
  it("permite ajustar controles y textos del producto en anchos pequeños", () => {
    expect(rule("familyCopy")).toContain("overflow-wrap: anywhere");
    expect(rule("familyActions")).toContain("flex-wrap: wrap");
    expect(rule("familyCartButton")).toContain("min-width: min(100%, 150px)");
  });
});
