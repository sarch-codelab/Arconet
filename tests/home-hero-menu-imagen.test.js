import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Tres ajustes del hero de la home:
//   1. los desplegables (Soluciones y Acceder) se animan en vez de aparecer de
//      golpe, y el panel de Soluciones ya no se sale por la izquierda;
//   2. la foto de la empresa deja de estar tapada por un velo casi opaco.

const HOME = "app/home-experience.js";
const CSS = "app/page.module.css";

const leer = (f) => readFileSync(f, "utf8");

describe("desplegables del hero con transición", () => {
  it("el panel de Soluciones se monta antes de abrirse", () => {
    const js = leer(HOME);
    // Si el montaje y la apertura ocurren en el mismo lote de React, el panel
    // nace ya abierto y el navegador no anima nada.
    expect(js).toContain("heroPanelMounted");
    expect(js).toContain("heroPanelListo");
    expect(js).toContain("setHeroPanelListo(true)");
    // La clase de apertura usa el estado diferido, no heroMenuOpen directo.
    expect(js).toMatch(/heroPanelListo \? ` \$\{styles\.cardMegaPanelOpen\}`/);
  });

  it("abrir y cerrar llevan retardo para no dispararse con un roce", () => {
    const js = leer(HOME);
    expect(js).toContain("abrirMenuHero");
    expect(js).toContain("programarCierre");
    expect(js).toContain("abrirAcceder");
    expect(js).toContain("programarCierreAcceder");
    // Los temporizadores se limpian al desmontar.
    expect(js).toMatch(/heroMenuTimer\.current\) clearTimeout\(heroMenuTimer\.current\)/);
    expect(js).toMatch(/accederTimer\.current\) clearTimeout\(accederTimer\.current\)/);
  });

  it("visibility no se interpola: se retrasa al cerrar", () => {
    const css = leer(CSS);
    // `transition: ... visibility 180ms` hacía desaparecer el panel a mitad de
    // la animación. Debe ser `visibility 0s linear <retardo>`.
    const mega = css.match(/\.cardMegaPanel \{[\s\S]*?\n\}/)?.[0] || "";
    expect(mega).toContain("visibility 0s linear 320ms");
    expect(mega).not.toMatch(/visibility \d+m?s\b(?! linear)/);
    const acceder = css.match(/\.accessMenuPanel \{[\s\S]*?\n\}/)?.[0] || "";
    expect(acceder).toContain("visibility 0s linear 280ms");
    expect(acceder).not.toMatch(/visibility 180ms[,;]/);
  });

  it("el panel de Soluciones se centra en su botón y no se sale de pantalla", () => {
    const js = leer(HOME);
    // Antes centraba sobre toda la navegación; con el botón cabe siempre.
    const bloque = js.slice(js.lastIndexOf("const centro ="), js.lastIndexOf("setHeroPanelPos"));
    expect(bloque).toContain("caja.left + caja.width / 2");
    expect(bloque).toContain("Math.max(16, Math.min(");
    // El panel también se reposiciona al cambiar entre disparadores.
    expect(js).toMatch(/\}, \[heroPanelMounted, heroMegaId\]\);/);
  });
});

describe("la foto de la empresa se ve limpia", () => {
  it("el velo del hero ya no la tapa", () => {
    const css = leer(CSS);
    const overlay = css.match(/\.heroOverlay \{[\s\S]*?\n\}/)?.[0] || "";
    expect(overlay).toBeTruthy();
    // Antes: 0.82 arriba y 0.92 abajo, la foto quedaba casi negra.
    const alfas = [...overlay.matchAll(/rgba\([^)]*?(\d*\.?\d+)\)/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n > 0 && n <= 1);
    expect(alfas.length).toBeGreaterThan(0);
    // El centro debe quedar casi transparente y ningún extremo pasar de 0.7.
    expect(Math.min(...alfas)).toBeLessThan(0.12);
    expect(Math.max(...alfas)).toBeLessThanOrEqual(0.7);
  });

  it("los extremos siguen oscurecidos para el menú y la franja de datos", () => {
    const css = leer(CSS);
    const overlay = css.match(/\.heroOverlay \{[\s\S]*?\n\}/)?.[0] || "";
    // Primer y último tramo del degradado con opacidad suficiente: el degradado
    // arranca oscuro (menú) y termina oscuro (franja de datos), claro en medio.
    const tramos = [...overlay.matchAll(/rgba\(8, 14, 26, ([\d.]+)\) 0%/g)].map((m) =>
      Number(m[1])
    );
    const cierre = overlay.match(/rgba\([^,]+, [^,]+, [^,]+, ([\d.]+)\) 100%/);
    if (cierre) tramos.push(Number(cierre[1]));
    expect(tramos.length).toBeGreaterThanOrEqual(2);
    expect(tramos[0]).toBeGreaterThanOrEqual(0.5);
    expect(tramos[tramos.length - 1]).toBeGreaterThanOrEqual(0.5);
  });
});
