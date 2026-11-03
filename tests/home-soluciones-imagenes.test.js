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
    expect(solutions).toContain('image: "/arconet.png"');
    expect(solutions).toContain('visual: "brandVisual"');
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
