import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CATALOGO = "app/tienda/catalogo-experience.js";
const CATALOGO_CSS = "app/tienda/catalogo-experience.module.css";
const DETALLE = "app/tienda/[slug]/product-detail.js";
const DETALLE_CSS = "app/tienda/[slug]/product-detail.module.css";

const leer = (archivo) => readFileSync(archivo, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("dock compartido con aparición al hacer scroll", () => {
  it("catálogo y ficha legacy reemplazan su cabecera flotante por NavDock", () => {
    for (const [nombre, archivo] of [["catálogo", CATALOGO], ["ficha legacy", DETALLE]]) {
      const fuente = leer(archivo);
      const dock = fuente.match(/<NavDock[\s\S]*?\n      \/>/)?.[0] || "";

      expect(dock, nombre).toContain('variant="scroll"');
      expect(dock, nombre).toContain("visible={scrolledPastHero}");
      expect(dock, nombre).toContain("navigation={STORE_NAVIGATION}");
      expect(dock, nombre).toContain("topbarRef={topbarRef}");
      expect(dock, nombre).toContain("cartAction={");
      expect(dock, nombre).toContain("onClick={openCart}");
      expect(fuente, nombre).not.toContain("styles.topbarVisible");
      expect(fuente, nombre).not.toContain("styles.topbarHidden");
      expect(fuente, nombre).not.toContain("styles.topbarShell");
      expect(fuente, nombre).not.toContain("styles.topbarNav");
    }
  });

  it("conserva los umbrales de aparición y el progreso de lectura", () => {
    const catalogo = leer(CATALOGO);
    const detalle = leer(DETALLE);

    expect(catalogo).toContain("scroll > window.innerHeight * 0.7");
    expect(detalle).toContain("scroll > window.innerHeight * 0.15");
    for (const fuente of [catalogo, detalle]) {
      expect(fuente).toContain('topbar.style.setProperty("--scroll-progress"');
      expect(fuente).toContain("scrollCallback:");
    }
  });

  it("retira la lógica duplicada del dock sin quitar el menú del hero", () => {
    const catalogo = leer(CATALOGO);
    const detalle = leer(DETALLE);

    expect(catalogo).not.toContain("mobileMenuOpen");
    expect(catalogo).not.toContain("megaMenu");
    expect(catalogo).not.toContain("navRef");
    expect(catalogo).toContain('<header className={styles.heroHeader}>');
    expect(catalogo).toContain("<MobileSiteMenu />");
    expect(detalle).not.toContain("const NAVIGATION = [");
  });

  it("el carrito conserva contraste, badge posicionado y etiqueta móvil accesible", () => {
    for (const archivo of [CATALOGO_CSS, DETALLE_CSS]) {
      const css = sinComentarios(leer(archivo));
      const accion = css.match(/\.headerAction\s*\{([^}]*)\}/)?.[1] || "";
      const icono = css.match(/\.headerCartIcon\s*\{([^}]*)\}/)?.[1] || "";
      const badge = css.match(/\.cartBadge\s*\{([^}]*)\}/)?.[1] || "";

      expect(accion, archivo).toContain("background: #171a22");
      expect(accion, archivo).toContain("color: #fff !important");
      expect(icono, archivo).toContain("position: relative");
      expect(icono, archivo).toContain("background: #fff");
      expect(icono, archivo).toContain("color: #0d1422");
      expect(badge, archivo).toContain("position: absolute");
      expect(css, archivo).toMatch(/\.headerCartLabel\s*\{\s*display: none;/);
    }
  });
});
