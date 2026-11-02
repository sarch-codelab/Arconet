import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const JS = "app/tienda/catalogo-experience.js";
const HERO = "public/catalogo/ingeniero-caso-panoramica.webp";

describe("rendimiento de /tienda", () => {
  it("el callback de scroll no provoca lecturas de layout por frame", () => {
    const js = readFileSync(JS, "utf8");
    const inicioMedida = js.indexOf("const measure =");
    const inicioUpdate = js.indexOf("const update =", inicioMedida);
    const inicioResize = js.indexOf("const handleResize =", inicioUpdate);
    const measure = js.slice(inicioMedida, inicioUpdate);
    const update = js.slice(inicioUpdate, inicioResize);

    expect(inicioMedida).toBeGreaterThan(-1);
    expect(inicioUpdate).toBeGreaterThan(inicioMedida);
    expect(inicioResize).toBeGreaterThan(inicioUpdate);
    expect(measure).toContain("document.documentElement.scrollHeight");
    expect(measure).toContain("hero?.offsetHeight");
    expect(update).not.toContain("scrollHeight");
    expect(update).not.toContain("offsetHeight");
    expect(js).toContain("new ResizeObserver(handleResize)");
  });

  it("solo renderiza al cruzar el umbral del dock", () => {
    const js = readFileSync(JS, "utf8");
    expect(js).toContain("scrolledPastHeroRef");
    expect(js).toContain("if (shouldShow !== scrolledPastHeroRef.current)");
    expect(js).not.toContain("setScrolledPastHero((current)");
  });

  it("el hero usa un WebP ligero y prioritario en lugar del PNG de 2.7 MB", () => {
    const js = readFileSync(JS, "utf8");
    const imagen = js.match(/<Image\s+src="\/catalogo\/ingeniero-caso-panoramica\.webp"[\s\S]*?\/>/)?.[0] || "";

    expect(imagen).toContain("priority");
    expect(imagen).toContain('sizes="100vw"');
    expect(statSync(HERO).size).toBeLessThan(200 * 1024);
    expect(existsSync("public/catalogo/ingeniero-caso-panoramica.png")).toBe(false);
  });
});
