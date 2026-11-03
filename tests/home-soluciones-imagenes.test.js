import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/home-experience.js", "utf8");
const css = readFileSync("app/page.module.css", "utf8");
const solutions = home.match(/const SOLUTIONS = \[[\s\S]*?\n\];/)?.[0] || "";

const photography = [
  "/soluciones/componentes-pasivos.webp",
  "/soluciones/instalacion-ftth.webp",
  "/soluciones/gabinetes-racks.webp",
];

describe("fotografías de Soluciones en movimiento", () => {
  it("usa imágenes profesionales locales en 01–03 y conserva el logo en 04", () => {
    expect(solutions).toBeTruthy();
    for (const image of photography) {
      expect(solutions).toContain(`image: "${image}"`);
      expect(existsSync(`public${image}`)).toBe(true);
      expect(statSync(`public${image}`).size).toBeLessThan(512 * 1024);
    }
    expect(solutions.match(/visual: "photoVisual"/g)).toHaveLength(3);
    expect(solutions).toContain('imageAlt: "Técnico instalando una tarjeta de red en un equipo de telecomunicaciones"');
    expect(solutions).toContain('image: "/arconet.png"');
    expect(solutions).toContain('visual: "brandVisual"');
  });

  it("usa cada fotografía como fondo completo de su panel desplazable", () => {
    expect(home).toContain('solution.visual === "photoVisual" ? styles.photoPanel : styles.brandPanel');
    expect(home).toContain('sizes="(max-width: 760px) 87vw, 100vw"');
    const fondo = css.match(/\.solutionPanel\.photoPanel \.solutionVisual\s*\{([^}]*)\}/)?.[1] || "";
    expect(fondo).toContain("position: absolute");
    expect(fondo).toContain("inset: 0");
    expect(fondo).toContain("height: 100%");
    expect(css).toMatch(/\.solutionPanel\.photoPanel::after\s*\{[^}]*linear-gradient/);
  });

  it("extiende los fondos bajo la cabecera y el pie sin franjas azules", () => {
    const sticky = css.match(/\.scrollReady \.solutionsSticky\s*\{([^}]*)\}/)?.[1] || "";
    const track = css.match(/\.scrollReady \.solutionTrack\s*\{([^}]*)\}/)?.[1] || "";
    const panel = css.match(/\.scrollReady \.solutionPanel\s*\{([^}]*)\}/)?.[1] || "";
    const heading = css.match(/\.scrollReady \.solutionsHeading\s*\{([^}]*)\}/)?.[1] || "";
    const footer = css.match(/\.scrollReady \.stageFooter\s*\{([^}]*)\}/)?.[1] || "";

    expect(sticky).toContain("top: 0");
    expect(sticky).toContain("height: 100svh");
    expect(track).toContain("position: absolute");
    expect(track).toContain("inset: 0");
    expect(track).toContain("height: 100%");
    expect(panel).toContain("height: 100%");
    expect(heading).toContain("position: absolute");
    expect(footer).toContain("position: absolute");
    expect(css).toMatch(/\.solutionsHeading, \.scrollReady \.solutionsHeading\s*\{[^}]*position: absolute/);
    expect(css).toMatch(/\.solutionTrack, \.scrollReady \.solutionTrack\s*\{[^}]*position: relative/);
  });

  it("modera los titulares para evitar saltos agresivos en computadoras", () => {
    const titulo = css.match(/\.solutionCopy h3\s*\{([^}]*)\}/)?.[1] || "";
    expect(titulo).toContain("font-size: clamp(40px, 4.2vw, 76px)");
    expect(titulo).toContain("line-height: 1.03");
  });

  it("pone en 04 el video solicitado, rotado hacia la derecha y optimizado", () => {
    expect(home).toContain('src="/soluciones/arconet-flechas-derecha.mp4"');
    expect(home).toContain('poster="/soluciones/arconet-flechas-derecha.jpg"');
    const video = css.match(/\.solutionPanel\.brandPanel \.brandVideoBackground > video\s*\{([^}]*)\}/)?.[1] || "";
    expect(video).toContain("object-position: center");
    expect(css).toMatch(/\.solutionPanel\.brandPanel\s*\{[^}]*isolation: isolate/);
    expect(statSync("public/soluciones/arconet-flechas-derecha.mp4").size).toBeLessThan(600 * 1024);
    expect(existsSync("public/soluciones/arconet-flechas-derecha.jpg")).toBe(true);
    expect(solutions).toContain('image: "/arconet.png"');
  });

  it("retira la presentación blanca de producto sin tocar los assets usados por el catálogo", () => {
    expect(solutions).not.toContain('image: "/splitters-opticos.png"');
    expect(solutions).not.toContain('image: "/gabinete-rack-de-piso.png"');
    expect(solutions).not.toContain('image: "/catalogo/infraestructura.jpg"');
    expect(css).not.toMatch(/^\.productVisual/m);
    expect(css).not.toMatch(/^\.rackVisual/m);
    expect(css).toMatch(/\.solutionImage\s*\{[^}]*object-fit: cover/);
    expect(existsSync("public/splitters-opticos.png")).toBe(true);
    expect(existsSync("public/gabinete-rack-de-piso.png")).toBe(true);
    expect(existsSync("public/catalogo/infraestructura.jpg")).toBe(true);
  });
});
