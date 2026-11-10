import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El "menú 1" es la cabecera que va DENTRO del hero (pestaña de logo a la
// izquierda, navegación centrada, pestaña de acción a la derecha). El "menú 2"
// es el NavDock flotante que aparece al hacer scroll y que NO debe cambiar.
//
// /tienda tenía una cabecera propia con otras medidas, otros enlaces y un
// MobileSiteMenu en lugar de la hamburguesa centrada del home. Estas pruebas
// fijan la paridad en PC y en teléfono; la única diferencia permitida es el
// contenido de la píldora (Carrito aquí, Acceder en el home).

const HOME_JS = "app/home-experience.js";
const HOME_CSS = "app/page.module.css";
const TIENDA_JS = "app/tienda/catalogo-experience.js";
const TIENDA_CSS = "app/tienda/catalogo-experience.module.css";

const leer = (archivo) => readFileSync(archivo, "utf8");
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Devuelve el cuerpo de la primera regla cuyo selector empieza por `selector`. */
function regla(css, selector) {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const coincidencia = css.match(
    new RegExp(`(?:^|\\n)${escapado}[^{}]*\\{([^}]*)\\}`, "m"),
  );
  return coincidencia ? coincidencia[1].replace(/\s+/g, " ").trim() : "";
}

function valor(cuerpo, propiedad) {
  return (
    cuerpo.match(new RegExp(`(?:^|;)\\s*${propiedad}\\s*:\\s*([^;]+)`, "i"))?.[1]?.trim() || ""
  );
}

/** Extrae el bloque completo de una media query, balanceando llaves. */
function media(css, condicion, contiene) {
  const marca = `@media (${condicion}) {`;
  let desde = 0;
  while (true) {
    const inicio = css.indexOf(marca, desde);
    if (inicio < 0) return "";
    let profundidad = 0;
    for (let i = inicio + marca.length - 1; i < css.length; i++) {
      if (css[i] === "{") profundidad++;
      if (css[i] === "}" && --profundidad === 0) {
        const bloque = css.slice(inicio, i + 1);
        if (!contiene || bloque.includes(contiene)) return bloque;
        desde = i + 1;
        break;
      }
    }
  }
}

describe("menú 1 de /tienda con la misma apariencia que el home", () => {
  it("muestra exactamente los mismos enlaces (navegación compartida)", () => {
    const tienda = leer(TIENDA_JS);
    const home = leer(HOME_JS);

    expect(tienda).toContain('import { STORE_NAVIGATION } from "../navigation-data"');
    expect(tienda).toContain("const heroMenu = useDockMenu(true, 1)");
    expect(tienda).toContain("heroMenu.items.map((item) =>");
    // Ya no hay una lista de enlaces local distinta a la del home.
    expect(tienda).not.toContain("const NAVIGATION = [");
    expect(tienda).not.toContain("{ label: \"Inicio\", mega: false");
    // Ambos despliegan el mega de Soluciones y marcan el enlace activo.
    expect(home).toContain("const heroMenu = useDockMenu(false, 1)");
    expect(home).toContain("heroMenu.items.map((item) =>");
    expect(tienda).toContain("styles.heroMegaTrigger");
    expect(tienda).toContain("styles.heroMegaPanel");
    expect(tienda).toContain("styles.navigationActive");
  });

  it("en PC comparte alto fluido, pestañas, logo y tipografía", () => {
    const home = sinComentarios(leer(HOME_CSS));
    const tienda = sinComentarios(leer(TIENDA_CSS));

    // Mismo alto en los cuatro bloques de la cabecera.
    for (const [delHome, deTienda] of [
      [".cardHeader", ".heroHeader"],
      [".cardLogoTab", ".heroLogoTab"],
      [".cardCenterNav", ".navigation"],
      [".cardActionTab", ".heroActionTab"],
    ]) {
      expect(valor(regla(tienda, deTienda), "height"), deTienda).toBe(
        valor(regla(home, delHome), "height"),
      );
      expect(valor(regla(tienda, deTienda), "height"), deTienda).toBe(
        "clamp(72px, 4.3vw, 92px)",
      );
    }

    // Mismo recorte y mismo relleno en las dos pestañas de papel.
    expect(valor(regla(tienda, ".heroLogoTab"), "padding")).toBe(
      valor(regla(home, ".cardLogoTab"), "padding"),
    );
    expect(valor(regla(tienda, ".heroActionTab"), "padding")).toBe(
      valor(regla(home, ".cardActionTab"), "padding"),
    );

    // Mismo logo de 232px y misma separación/tipografía de la navegación.
    expect(valor(regla(tienda, ".heroLogoImg"), "width")).toBe("232px");
    expect(valor(regla(home, ".heroLogoImg"), "width")).toBe("232px");
    expect(valor(regla(tienda, ".navigation"), "gap")).toBe(
      valor(regla(home, ".cardCenterNav"), "gap"),
    );
    expect(regla(tienda, ".navigation a")).toContain(
      "font-size: clamp(13.5px, 0.95vw, 18px)",
    );
    expect(regla(home, ".cardCenterNav a")).toContain(
      "font-size: clamp(13.5px, 0.95vw, 18px)",
    );

    // Misma píldora y misma hamburguesa de 44px.
    for (const [propiedad, esperado] of [
      ["font-size", "clamp(13px, 0.9vw, 17px)"],
      ["gap", "clamp(12px, 0.7vw, 16px)"],
    ]) {
      expect(valor(regla(tienda, ".contactButton"), propiedad)).toBe(esperado);
      expect(valor(regla(home, ".cardTopPill"), propiedad)).toBe(esperado);
    }
    expect(valor(regla(tienda, ".heroMenuToggle"), "width")).toBe(
      valor(regla(home, ".cardMenuToggle"), "width"),
    );
    expect(valor(regla(tienda, ".heroMenuToggle"), "width")).toBe("44px");
  });

  it("en teléfono usa la misma rejilla, logo y hamburguesa centrada", () => {
    const home = media(sinComentarios(leer(HOME_CSS)), "max-width: 760px", ".cardHeader");
    const tienda = media(sinComentarios(leer(TIENDA_CSS)), "max-width: 760px", ".heroHeader");

    for (const bloque of [home, tienda]) {
      expect(bloque).toContain("height: 56px");
      expect(bloque).toContain("grid-template-columns: auto 1fr auto");
      expect(bloque).toContain("justify-self: center");
      expect(bloque).toContain("justify-self: end");
      expect(bloque).toContain("width: 130px");
    }
    expect(tienda).toContain(".navigation { display: none; }");
    expect(tienda).toContain(".heroMenuToggle { display: block; justify-self: center; }");

    // Y el mismo ajuste para pantallas muy estrechas.
    const homeCorto = media(sinComentarios(leer(HOME_CSS)), "max-width: 340px");
    const tiendaCorto = media(sinComentarios(leer(TIENDA_CSS)), "max-width: 340px");
    expect(homeCorto).toContain("width: 92px");
    expect(tiendaCorto).toContain("width: 92px");
  });

  it("el panel móvil trae Tienda, Login/Admin, Soluciones y legales", () => {
    const tienda = leer(TIENDA_JS);
    const css = sinComentarios(leer(TIENDA_CSS));

    expect(tienda).not.toMatch(/import MobileSiteMenu|<MobileSiteMenu/);
    expect(tienda).toContain("createPortal(");
    expect(tienda).toContain('id="tienda-mobile-menu"');
    expect(tienda).toContain("styles.heroMobilePrimaryLabel}>{heroMenu.primary.label}<");
    expect(tienda).toContain('href="/login"');
    expect(tienda).toContain('href="/admin"');
    expect(tienda).toContain("item.megaGroups.map");
    expect(tienda).toContain("heroMenu.legal.map");
    expect(tienda).toContain("cycleTheme");
    expect(tienda).toContain("styles.heroMenuBackdrop");
    // Escape y bloqueo de scroll, como en el home.
    expect(tienda).toContain('event.key === "Escape"');
    expect(tienda).toContain('document.body.style.overflow = "hidden"');
    // El panel va en portal porque el hero recorta con overflow: hidden.
    expect(css).toMatch(/\.heroMobileMenu\s*\{[^}]*position: fixed;[^}]*z-index: 1201;/);
    expect(css).toMatch(/@keyframes heroMenuIn/);
  });

  it("con movimiento reducido los paneles siguen animados y terminan visibles", () => {
    const css = sinComentarios(leer(TIENDA_CSS));
    const reducido = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.heroMegaPanel[\s\S]*?\n\}/,
    )?.[0] || "";

    expect(reducido).toContain(".heroMegaPanel");
    expect(reducido).toContain(".heroMobileMenu");
    expect(reducido).toContain("animation-name: heroFadeVisible");
    expect(css).toMatch(/@keyframes heroFadeVisible\s*\{[\s\S]*?to\s*\{\s*opacity: 1;/);
    // Las animaciones de entrada no están escondidas detrás de no-preference.
    expect(css).not.toContain("prefers-reduced-motion: no-preference");
    // Ningún panel parte de opacity: 0 de forma permanente.
    expect(regla(css, ".heroMobileMenu")).toContain("animation: heroMenuIn");
  });

  it("conserva el carrito y el menú 2 (NavDock) sin tocarlos", () => {
    const tienda = leer(TIENDA_JS);

    // La píldora del menú 1 sigue abriendo el carrito, con su badge.
    expect(tienda).toContain("styles.contactButton");
    expect(tienda).toContain("onClick={openCart}");
    expect(tienda).toContain("styles.cartBadge");
    // El logo no genera un preload huérfano (contrato de React 19).
    expect(tienda).toContain('sizes="(max-width: 760px) 130px, 232px"');
    expect(tienda).toContain('fetchPriority="low"');
    expect(tienda).not.toContain('src="/arconet.png" priority');

    // Menú 2 intacto: sigue apareciendo al pasar el hero.
    expect(tienda).toContain('variant="scroll"');
    expect(tienda).toContain("visible={scrolledPastHero}");
    expect(tienda).toContain("navigation={STORE_NAVIGATION}");
    expect(tienda).toContain("cartAction={");
    expect(tienda).toContain("scroll > viewportHeight * 0.7");
  });
});
