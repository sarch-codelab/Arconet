import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");

const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");

describe("scroll: desplazamiento suave sin tirones", () => {
  it("la rueda es nativa, sin interpolación ni cancelación de eventos", () => {
    expect(casa).toContain("observeNativeScroll(updateScrollEffects");
    expect(casa).not.toContain("LocomotiveScroll");
    expect(casa).not.toContain("smoothWheel");
  });

  it("solo los desplazamientos explícitos consultan movimiento reducido", () => {
    const helper = leer("lib", "native-scroll.js");
    expect(helper).toContain("prefers-reduced-motion");
    expect(helper).toContain('immediate || reduced ? "instant" : "smooth"');
  });

  it("el scroll vertical no sobrescribe el carrusel móvil ni mide layout por frame", () => {
    const inicio = casa.indexOf("const updateScrollEffects =");
    const bloque = casa.slice(inicio, casa.indexOf("const scrollController =", inicio));
    expect(bloque).toContain("!mobile && slide !== nextSlide");
    expect(bloque).not.toMatch(/getBoundingClientRect|offsetHeight|scrollHeight|matchMedia/);
    expect(casa).toContain("const onTrackScroll = () =>");
  });

  it("la pista de 400vw no se promueve a capa propia de la GPU", () => {
    const bloque = css.slice(css.indexOf(".scrollReady .solutionTrack"));
    const regla = bloque.slice(0, bloque.indexOf("}"));
    // Se quitan los comentarios: solo importa la declaración real.
    const soloPropiedades = regla.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(soloPropiedades).toContain("translate3d");
    expect(soloPropiedades).not.toContain("will-change");
  });
});
