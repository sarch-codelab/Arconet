import { readFileSync, existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La cita de la home llevaba un degradado azul plano. Ahora usa de fondo la
// imagen que envió el cliente, con velo por tema para que el texto mantenga
// contraste (la foto tiene una mitad casi blanca).

const CSS = "app/page.module.css";
const IMAGEN = "public/cita-fondo.webp";

const leer = (f) => readFileSync(f, "utf8");

describe("cita de la home con imagen de fondo", () => {
  it("la imagen existe y no pesa de más", () => {
    expect(existsSync(IMAGEN)).toBe(true);
    // Es un fondo: si pesa más de 200 KB penaliza la carga de la home.
    expect(statSync(IMAGEN).size).toBeLessThan(200 * 1024);
  });

  it("el bloque usa la imagen como fondo, no el degradado plano", () => {
    const css = leer(CSS);
    const bloque = css.match(/\.quoteInner \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toContain('url("/cita-fondo.webp")');
    expect(bloque).toContain("background-size: cover");
    // El degradado azul anterior ya no debe ser el fondo del bloque.
    expect(bloque).not.toContain("linear-gradient(135deg, #0c2874");
  });

  it("tiene un color de respaldo si la imagen no carga", () => {
    const bloque = leer(CSS).match(/\.quoteInner \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toMatch(/background-color:\s*#/);
  });

  it("el velo se ajusta por tema para no perder el texto", () => {
    const css = leer(CSS);
    // Capa propia (::before) y una variable por tema.
    expect(css).toContain(".quoteInner::before");
    expect(css).toContain('html[data-theme="dark"]) .quoteInner');
    expect(css).toContain('html[data-theme="light"]) .quoteInner');
    // Velos distintos: oscuro azul, claro blanco.
    expect(css).toMatch(/--quote-veil:\s*rgba\(9, 30, 78/);
    expect(css).toMatch(/--quote-veil:\s*rgba\(255, 255, 255/);
  });

  it("el texto y la firma toman su color del tema", () => {
    const css = leer(CSS);
    expect(css).toMatch(/\.quoteInner p \{[\s\S]*?color: var\(--quote-ink/);
    expect(css).toMatch(/\.quoteInner cite \{[\s\S]*?color: var\(--quote-cite/);
    // Ambos temas declaran los dos colores, sin dejar uno heredado.
    expect(css).toMatch(/html\[data-theme="dark"\]\) \.quoteInner \{[\s\S]*?--quote-ink[\s\S]*?--quote-cite/);
    expect(css).toMatch(/html\[data-theme="light"\]\) \.quoteInner \{[\s\S]*?--quote-ink[\s\S]*?--quote-cite/);
  });

  it("la cita sigue siendo el mismo texto", () => {
    const home = leer("app/home-experience.js");
    expect(home).toContain("<HomeWarpQuote />");
    expect(leer("app/home-warp-quote.js")).toContain("No vendemos solo equipo: ayudamos a que cada conexión funcione.");
    expect(home).toContain("Equipo Arconet · San Pedro Sula, Honduras");
  });
});
