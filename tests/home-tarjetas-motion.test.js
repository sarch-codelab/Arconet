import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/home-experience.js", "utf8");
const marcas = readFileSync("app/home-marcas.js", "utf8");
const css = readFileSync("app/page.module.css", "utf8");

describe("coreografía de tarjetas de portada", () => {
  it("reutiliza el reveal de entrada una sola vez sin tocar los carruseles", () => {
    expect(home.match(/data-reveal data-card-reveal/g)).toHaveLength(8);
    expect(marcas.match(/data-reveal data-card-reveal/g)).toHaveLength(2);
    expect(home).toContain("observer.unobserve(entry.target)");
    const solutions = home.slice(home.indexOf('id="soluciones"'), home.indexOf('id="empresa"'));
    expect(solutions).not.toContain("data-card-reveal");
  });

  it("prepara las tarjetas antes de observar y las libera al desmontar", () => {
    expect(home).toContain('target.hasAttribute("data-card-reveal")');
    expect(home).toContain("target.classList.add(styles.cardPending)");
    expect(home).toContain("target.classList.remove(styles.cardPending)");
    expect(css).toContain(".cardPending:not(.revealVisible):not(:focus-within)");
    expect(css).toContain("opacity: 0.45");
  });

  it("solo anima transform y opacity, sin capas permanentes ni bloqueo del hover", () => {
    const frames = css.match(/@keyframes cardDepthIn\s*\{[\s\S]*?\n\}/)[0];
    const properties = [...frames.matchAll(/^\s+([\w-]+):/gm)].map((match) => match[1]);
    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]));
    expect(frames).toContain("opacity: 1");
    const rule = css.match(/\.revealVisible\[data-card-reveal\]\s*\{[^}]*\}/)[0];
    expect(rule).toContain("backwards");
    expect(rule).not.toContain("will-change");
    expect(rule).not.toContain("opacity: 0");
    expect(css).toContain("--card-delay: 170ms");
  });

  it("reduce el recorrido móvil y ofrece un fundido real sin desplazamiento con reduce", () => {
    const mobile = css.slice(css.indexOf("@media (max-width: 760px)", css.indexOf("@keyframes cardDepthIn")));
    expect(mobile).toContain("--card-rise: 14px");
    expect(mobile).toContain("--card-delay: 70ms");
    const fade = css.match(/@keyframes cardFadeIn\s*\{[\s\S]*?\n\}/)[0];
    expect(fade).toContain("opacity: 1");
    expect(fade).not.toContain("transform");
    expect(css).toContain("animation-name: cardFadeIn");
    expect(css).toContain("animation-duration: 420ms");
  });
});
