import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HERO_IMAGE, HERO_SLIDES } from "../app/catalogo/vitrina-data";

describe("imágenes de los destacados del hero", () => {
  it("conserva la primera imagen y asigna una diferente a cada diapositiva", () => {
    expect(HERO_SLIDES).toHaveLength(3);
    expect(HERO_SLIDES[0].image).toBe(HERO_IMAGE);
    expect(new Set(HERO_SLIDES.map((slide) => slide.image)).size).toBe(HERO_SLIDES.length);
    for (const slide of HERO_SLIDES) {
      expect(slide.imageAlt).toBeTruthy();
      expect(statSync(`public${slide.image}`).size).toBeGreaterThan(1000);
      expect(readFileSync(`public${slide.image}`).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    }
  });

  it("la imagen sigue la diapositiva y solo la primera se solicita con prioridad", () => {
    const componente = readFileSync("app/catalogo/catalogo-experience.js", "utf8");
    expect(componente).toContain("src={slide.image || HERO_IMAGE}");
    expect(componente).toContain("alt={slide.imageAlt}");
    expect(componente).toContain("priority={diapositiva === 0}");
    expect(componente).toContain('aria-label="Destacado anterior"');
    expect(componente).toContain('aria-label="Destacado siguiente"');
  });
});
