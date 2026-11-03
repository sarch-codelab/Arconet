import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/tienda/categoria/[slug]/category-products.module.css", "utf8");
const js = readFileSync("app/tienda/categoria/[slug]/category-products.js", "utf8");
const rule = name => css.match(new RegExp(`\\.${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] || "";

describe("categorías adaptables a pantalla y fotografía", () => {
  it("equilibra la portada y reserva espacio sin recortar la imagen", () => {
    expect(rule("hero")).toContain("minmax(0, 1.05fr) minmax(0, 1fr)");
    expect(rule("hero")).toContain("max-width: 1600px");
    expect(rule("heroVisual")).toContain("height: clamp(240px, 34vw, 540px)");
    expect(rule("heroImage")).toContain("object-fit: contain");
    expect(rule("heroImage")).not.toContain("object-fit: cover");
    expect(rule("heroVisual")).toContain("background: transparent");
  });
  it("no permite que el título largo imponga un ancho mínimo a la columna", () => {
    expect(rule("heroContent")).toContain("min-width: 0");
    expect(css).toMatch(/\.hero h1 \{[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.hero h1 \{[^}]*font-size: clamp\(28px, 3.2vw, 48px\)/);
    expect(rule("breadcrumb span")).toContain("overflow-wrap: anywhere");
  });
  it("apila en tableta sin una columna de mínimo intrínseco y limita el alto", () => {
    const tablet = css.slice(css.indexOf("@media (max-width: 1023px)"));
    expect(tablet).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(tablet).toContain("height: clamp(190px, 52vw, 360px)");
    expect(tablet).toContain("max-height: 52svh");
    expect(js).toContain('sizes="(max-width: 1023px) 90vw, (max-width: 1600px) 46vw, 720px"');
  });
  it("permite ajustar controles y textos del producto en anchos pequeños", () => {
    expect(rule("familyCopy")).toContain("overflow-wrap: anywhere");
    expect(rule("familyActions")).toContain("flex-wrap: wrap");
    expect(rule("familyCartButton")).toContain("min-width: min(100%, 150px)");
  });
});
