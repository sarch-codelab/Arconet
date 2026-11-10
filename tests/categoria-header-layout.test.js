import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La categoría reutiliza el menú 2 del home, pero con presencia fija: debe
// estar visible desde el primer render y no aparecer al superar el hero.
const JS = "app/tienda/categoria/[slug]/category-products.js";
const CSS = "app/tienda/categoria/[slug]/category-products.module.css";
const DOCK_CSS = "app/nav-dock.module.css";
const NAVIGATION = "app/navigation-data.js";

const leer = (f) => readFileSync(f, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("header de la página de categoría", () => {
  it("usa el menú 2 al desplazar, sin el header sticky anterior", () => {
    const js = leer(JS);
    const css = sinComentarios(leer(DOCK_CSS));
    const fija = css.match(/\.topbarFixed\s*\{([^}]*)\}/)?.[1] || "";

    expect(js).toContain("<NavDock");
    expect(js).toContain('variant="scroll"');
    expect(js).toContain('visible={scrolledPastHeader}');
    expect(js).toContain("cartAction={");
    expect(js).not.toContain("<header className={styles.header}>");
    expect(css).toMatch(/\.topbar\s*\{[^}]*position: fixed/);
    expect(fija).toContain("opacity: 1");
    expect(fija).toContain("visibility: visible");
    expect(fija).toContain("transform: none");
    expect(fija).toContain("transition: none");
  });

  it("comparte los destinos del home y adapta sus anclas para las páginas de tienda", () => {
    const js = leer(JS);
    const navigation = leer(NAVIGATION);
    const bloque = navigation.match(/export const NAVIGATION = \[([\s\S]*?)\];/)?.[1] || "";

    expect((bloque.match(/href:/g) || []).length).toBeGreaterThan(6);
    expect(navigation).toContain('label: "Soluciones"');
    expect(navigation).toContain('label: "Tienda", href: "/tienda"');
    expect(navigation).toContain("export const STORE_NAVIGATION = NAVIGATION.map");
    expect(navigation).toContain('item.href.startsWith("#")');
    expect(navigation).toContain("`/${item.href}`");
    expect(js).toContain("navigation={STORE_NAVIGATION}");
  });

  it("mantiene navegación móvil y acciones compactas sin romper la cápsula", () => {
    const js = leer(JS);
    const dock = sinComentarios(leer(DOCK_CSS));
    const css = sinComentarios(leer(CSS));

    expect(js).not.toContain("MobileSiteMenu");
    expect(dock).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.navigation a\s*\{\s*display: none;/);
    expect(dock).toMatch(/\.menuToggle\s*\{[^}]*display: block/);
    expect(dock).toMatch(/\.topbarMenuOpen \.mobileMenu\s*\{[^}]*position: fixed/);
    expect(css).toMatch(/\.headerCartLabel\s*\{\s*display: none;/);
  });

  it("ningún breakpoint de 700px reintroduce el header sustituido", () => {
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
