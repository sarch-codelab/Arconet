import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La sección "Cobertura nacional" de la home era un mapa de municipios en
// píldoras. Ahora es una vitrina de fabricantes: logos reales, cifras,
// respaldo y cierre hacia el catálogo.

const HOME = "app/home-experience.js";
const MARCAS = "app/home-marcas.js";
const CSS = "app/home-marcas.module.css";

const leer = (f) => readFileSync(f, "utf8");

describe("sección de marcas de la home", () => {
  it("la home usa el componente nuevo en lugar del mapa de municipios", () => {
    const home = leer(HOME);
    expect(home).toContain("<HomeMarcas />");
    expect(home).not.toContain("coverageList");
    expect(home).not.toContain("Dónde llegamos");
    expect(home).not.toContain("const COVERAGE = [");
  });

  it("mantiene el encabezado que pidió el cliente", () => {
    const marcas = leer(MARCAS);
    expect(marcas).toContain("Cobertura nacional");
    expect(marcas).toContain("Tecnología respaldada");
    expect(marcas).toContain("por fabricantes.");
  });

  it("muestra imágenes de marca y un respaldo textual si no hay archivo", () => {
    const marcas = leer(MARCAS);
    // Logos reales en /public/marcas.
    expect(marcas).toContain("/marcas/fiberhome.png");
    expect(marcas).toContain("/marcas/sumitomo.png");
    expect(marcas).toContain("/marcas/lindsay.png");
    expect(marcas).toContain("/marcas/joinwit.png");
    // PBI y Belden no tienen archivo: van como texto, sin logo inventado.
    expect(marcas).toContain('{ nombre: "PBI", logo: ""');
    expect(marcas).toContain('{ nombre: "Belden", logo: ""');
    expect(marcas).toContain("logoTexto");
  });

  it("los logos no se deforman: altura fija y tope de ancho", () => {
    const css = leer(CSS);
    const bloque = css.match(/\.logo \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toContain("height: 38px");
    expect(bloque).toContain("max-width");
    expect(bloque).toContain("object-fit: contain");
  });

  it("en tema oscuro la marca se mantiene legible", () => {
    const css = leer(CSS);
    // Placa clara detrás del logo: Joinwit es negro y desaparecería.
    expect(css).toContain('html[data-theme="dark"]) .logoCaja');
    // El texto de las marcas sin logo también debe ser oscuro sobre la placa.
    expect(css).toContain('html[data-theme="dark"]) .logoTexto');
  });

  it("no inventa estrellas ni valoraciones", () => {
    const marcas = leer(MARCAS);
    expect(marcas).not.toContain("Star");
    expect(marcas).not.toMatch(/rese[ñn]as/i);
  });

  it("se apila en móvil y respeta reducir movimiento", () => {
    const css = leer(CSS);
    expect(css).toMatch(/@media \(max-width: 760px\)/);
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(":focus-visible");
  });
});
