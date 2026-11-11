import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/catalogo/catalogo-experience.module.css", "utf8");
const catalogo = readFileSync("app/catalogo/catalogo-experience.js", "utf8");
const navigation = readFileSync("app/public-site-navigation.js", "utf8");

describe("herramientas y navegación del catálogo", () => {
  it("integra la búsqueda y filtros sin otra cabecera ni logo", () => {
    expect(catalogo).toContain("data-catalog-toolbar");
    expect(catalogo).toContain('id="buscar-catalogo"');
    expect(catalogo).toContain("styles.categoryMenuWrap");
    expect(catalogo).toContain("styles.headerActions");
    expect(catalogo).not.toContain('src="/arconet.png"');
    expect(catalogo).not.toContain("styles.topbar");
    expect(css).toContain('grid-template-areas: "search category chips account locale"');
    expect(css).toContain('grid-template-areas: "search search account" "category chips chips"');
  });

  it("muestra el dock al salir las herramientas, sin cambiar otras páginas", () => {
    expect(navigation).toContain('pathname === "/catalogo"');
    expect(navigation).toContain('document.querySelector("[data-catalog-toolbar]")');
    expect(navigation).toContain("toolbar.getBoundingClientRect().bottom <= 0 : window.scrollY > 100");
    expect(css).toContain("scroll-margin-top: 108px");
  });
});
