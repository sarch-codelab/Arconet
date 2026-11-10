import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/home-experience.js", "utf8");
const css = readFileSync("app/page.module.css", "utf8");
const hero = home.slice(home.indexOf("{heroMenu.items.some((item) => item.mega) && heroPanelMounted"), home.indexOf("{/* Dock de navegación secundaria"));
const dock = home.slice(home.indexOf("{dockMenu.items.some((item) => item.mega) && ("), home.indexOf("{menuOpen && (") );

describe("paridad visual del desplegable de Soluciones en Home", () => {
  it("comparte los componentes visuales del menú 2 sin mezclar sus datos", () => {
    for (const name of ["desktopMenuTop", "desktopMenuPrimary", "desktopMenuPrimaryText", "desktopMenuPrimaryLabel", "desktopMenuPrimaryHint", "desktopMenuPrimaryIcon", "desktopMenuAuth", "desktopMenuLogin", "desktopMenuAdmin", "desktopMenuGroup", "desktopMenuLegal"]) {
      expect(hero).toContain(`styles.${name}`);
      expect(dock).toContain(`styles.${name}`);
    }
    for (const campo of ["primary", "legal", "items"]) {
      expect(hero).toContain(`heroMenu.${campo}`);
      expect(dock).toContain(`dockMenu.${campo}`);
    }
    expect(hero).not.toContain("dockMenu.");
    expect(hero).toContain("heroMenu.primary.enabled &&");
    expect(hero).toContain("item.keyId === heroMegaId");
    expect(hero).toContain("href={item.href} role=\"menuitem\"");
  });

  it("mantiene acceso por teclado, posicionamiento y colores de ambos temas", () => {
    expect(hero).toContain("onFocusCapture");
    expect(hero).toContain("onBlurCapture");
    expect(home).toContain('event.key === "Escape"');
    expect(home).toContain('document.addEventListener("keydown", alTeclado)');
    expect(home).toContain("Math.min(1180, window.innerWidth - 48)");
    const panel = css.match(/\.cardMegaPanel \{[\s\S]*?\n\}/)?.[0];
    expect(panel).toContain("width: min(1180px, calc(100vw - 48px))");
    expect(panel).toContain("overflow-y: auto");
    expect(panel).toContain("background: rgba(250, 249, 246, 0.985)");
    expect(css).toContain(':global(html[data-theme="dark"]) .cardMegaPanel');
  });
});
