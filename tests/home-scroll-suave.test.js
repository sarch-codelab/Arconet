import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");

const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");

describe("scroll: desplazamiento suave sin tirones", () => {
  it("la inercia no es tan larga que se sienta trabada", () => {
    const lerp = casa.match(/lerp:\s*([\d.]+)/);
    expect(lerp).not.toBeNull();
    // 0.085 dejaba un arrastre largo entre golpes de rueda.
    expect(Number(lerp[1])).toBeGreaterThanOrEqual(0.1);
  });

  it("se respeta la preferencia de menos movimiento", () => {
    expect(casa).toContain("respectReducedMotion: true");
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
