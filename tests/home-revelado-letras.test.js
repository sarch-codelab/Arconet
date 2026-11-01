import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");
const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");

describe("revelado tipográfico de títulos", () => {
  it("se aplica a los títulos principales y al de categorías", () => {
    const marcas = casa.match(/data-split/g)?.length ?? 0;
    expect(marcas).toBeGreaterThanOrEqual(9);
  });

  it("respeta los elementos anidados para no perder el estilo de la 2ª línea", () => {
    // Si se usara textContent se borrarían los <em> y su color azul.
    expect(casa).not.toMatch(/titulo\.textContent = ""/);
    expect(casa).toContain("padre.replaceChild(fragmento, nodo)");
    expect(casa).toContain('nodo.tagName === "BR"');
  });

  it("divide por palabras y no por letras", () => {
    expect(casa).toContain("split(/(\\s+)/)");
    expect(casa).toContain("styles.palabra");
    expect(casa).toContain("styles.palabraInterior");
  });

  it("la cascada tiene retraso acotado para que no se eternice", () => {
    expect(casa).toMatch(/Math\.min\(indice \* 45, 620\)|Math\.min\(indice \* 45, \d+\)/);
  });

  it("respeta prefers-reduced-motion", () => {
    expect(casa).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.palabraInterior\s*\{[^}]*transform:\s*none/);
  });

  it("la clase de activación existe suelta para que CSS Modules la exporte", () => {
    // Si solo aparece como ".palabrasListas .hijo", styles.palabrasListas es undefined.
    expect(css).toMatch(/^\.palabrasListas\s*\{/m);
  });

  it("cada palabra se revela con una máscara, sin mover el layout", () => {
    const ext = css.match(/\.palabra\s*\{[^}]*\}/)?.[0] ?? "";
    expect(ext).toContain("overflow: hidden");
    expect(ext).toContain("display: inline-block");
    expect(css).toMatch(/\.palabraInterior\s*\{[^}]*translateY\(110%\)/);
  });
});

describe("menú 1: el panel de Soluciones no se descuadra", () => {
  it("el panel vive fuera del hero para que fixed use la ventana", () => {
    // El ancestro con transform/animation haría que fixed se posicione
    // respecto a él y el panel saldría corrido.
    const main = casa.indexOf("<main className={styles.experience}>");
    // El marcado del panel, no la referencia al className dentro del handler.
    const panel = casa.indexOf("aria-label=\"Soluciones\"");
    const hero = casa.indexOf("<div className={styles.heroFrame}>");
    expect(main).toBeLessThan(panel);
    expect(panel).toBeLessThan(hero);
  });

  it("el heroFrame no deja el transform aplicado", () => {
    const frame = css.match(/\.heroFrame\s*\{[^}]*\}/)?.[0] ?? "";
    expect(frame).toContain("animation-fill-mode: none");
  });

  it("no queda una copia duplicada del panel", () => {
    expect(casa.match(/cardMegaAll/g)?.length).toBe(1);
    expect(casa.match(/role="menu"/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("los grupos entran escalonados al abrir el panel", () => {
    expect(css).toMatch(/\.cardMegaPanelOpen \.cardMegaGroup:nth-child\(1\)[\s\S]*?transition-delay/);
  });
});
