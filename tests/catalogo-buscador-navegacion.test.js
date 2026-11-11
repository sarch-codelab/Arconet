import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/catalogo/catalogo-experience.module.css", "utf8");
const dock = readFileSync("app/nav-dock.js", "utf8");

describe("buscador y navegación flotante en catálogo", () => {
  it("separa la cabecera fija del dock solo cuando está visible", () => {
    expect(dock).toContain('data-scroll-dock-visible={esScroll && visibleDock ? "true" : undefined}');
    expect(css).toMatch(/\.topbar\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*39;/);
    expect(css).toContain(':global([data-scroll-dock-visible="true"]) ~ .page .topbar');
    expect(css).toContain("top: calc(20px + clamp(62px, 3.6vw, 78px))");
    expect(css).toContain("top: 76px");
    expect(css).toContain("top: 70px");
  });

  it("deja espacio para ambas barras al navegar a las secciones", () => {
    expect(css).toContain("scroll-margin-top: 180px");
    expect(css).toContain("scroll-margin-top: 220px");
    expect(css).toContain("scroll-margin-top: 240px");
  });
});
