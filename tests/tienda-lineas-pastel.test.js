import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La rejilla "Líneas de producto" de /tienda se rehizo con el diseño de la
// referencia (msk.rt.ru/b2b): placa pastel, título arriba y objeto 3D dentro.
// Las fotos oscuras anteriores no servían para ese patrón.

const JS = "app/tienda/catalogo-experience.js";
const CSS = "app/tienda/catalogo-experience.module.css";

const SLUGS = [
  "soluciones-de-preconectorizado",
  "herrajes",
  "gabinetes-y-racks",
  "cajas-de-distribucion-y-emplazamiento",
  "soluciones-activas-y-accesorios-ftth",
  "herramientas-y-kits",
  "escaleras",
  "optical-distribution-frame-odf",
  "instrumentos-de-medicion-optica",
  "componentes-pasivos",
  "microcables-y-microproductos",
];

describe("líneas de producto con placas pastel", () => {
  it("todas las líneas resuelven a una ilustración existente", () => {
    const js = readFileSync(JS, "utf8");
    for (const slug of SLUGS) {
      // Las claves con guion van entre comillas y las simples no.
      const declarado = js.includes(`"${slug}"`) || js.includes(`\n  ${slug}: `);
      expect(declarado, `falta el slug ${slug}`).toBe(true);
    }
    // Las rutas del mapa existen en disco.
    const rutas = [...js.matchAll(/"(\/catalogo\/lineas\/cards\/[a-z]+\.webp)"/g)].map((m) => m[1]);
    expect(rutas.length).toBeGreaterThanOrEqual(10);
    for (const r of rutas) {
      const disco = `public${r}`;
      expect(existsSync(disco), `falta ${disco}`).toBe(true);
    }
  });

  it("las ilustraciones son ligeras para una rejilla de 11 tarjetas", () => {
    const js = readFileSync(JS, "utf8");
    const rutas = [
      ...new Set([...js.matchAll(/"(\/catalogo\/lineas\/cards\/[a-z]+\.webp)"/g)].map((m) => m[1])),
    ];
    let total = 0;
    for (const r of rutas) total += statSync(`public${r}`).size;
    // Sin optimizar pesaban 3.4 MB; en WebP la rejilla entera queda bajo 1 MB.
    expect(total).toBeLessThan(1024 * 1024);
  });

  it("cada tarjeta enlaza a su categoría", () => {
    const js = readFileSync(JS, "utf8");
    expect(js).toContain("href={`/tienda/categoria/${example.slug}`}");
  });

  it("la tarjeta usa placa pastel con el título encima y flecha", () => {
    const css = readFileSync(CSS, "utf8");
    // La ilustración cubre la tarjeta entera.
    expect(css).toMatch(/\.exampleVisual \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
    expect(css).toMatch(/\.exampleImage \{[\s\S]*?object-fit: cover;/);
    // Título por encima de la imagen.
    expect(css).toMatch(/\.exampleCopy \{[\s\S]*?z-index: 1;/);
    expect(css).toMatch(/\.exampleArrow \{[\s\S]*?border-radius: 50%;/);
  });

  it("no quedan restos del diseño anterior", () => {
    const css = readFileSync(CSS, "utf8");
    const js = readFileSync(JS, "utf8");
    // Reglas del patrón viejo (imagen con marco y texto debajo).
    expect(css).not.toContain(".exampleLink");
    expect(js).not.toContain("exampleLink");
    expect(js).not.toContain("mix-blend-mode");
    // El desplazamiento heredado recortaba la placa en móvil.
    expect(css).not.toMatch(/\.exampleVisual \{ max-width: 260px; \}/);
  });

  it("la foto subida desde el panel manda sobre la ilustración", () => {
    const js = readFileSync(JS, "utf8");
    // El panel guarda la imagen como data URL; es lo único que hay que
    // distinguir para saber que la categoría se editó a mano.
    expect(js).toContain('category.foto.startsWith("data:")');
    // El orden importa: si la ilustración va primero, cambiar la foto en el
    // panel no tiene ningún efecto sobre la tarjeta.
    const bloque = js.slice(js.indexOf("const subida"), js.indexOf("/catalogo/hero-fiber.jpg"));
    const posFoto = bloque.indexOf("foto ||");
    const posArte = bloque.indexOf("LINE_ART[category.slug]");
    expect(posFoto).toBeGreaterThan(-1);
    expect(posArte).toBeGreaterThan(-1);
    expect(posFoto).toBeLessThan(posArte);
  });

  it("el título se lee también sobre una foto oscura del panel", () => {
    const css = readFileSync(CSS, "utf8");
    const bloque = css.match(/\.exampleCopy h3 \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toMatch(/background:\s*rgba\(255, 255, 255/);
    expect(bloque).toContain("backdrop-filter");
  });

  it("se adapta a móvil sin desbordar", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toMatch(/\.exampleGrid \{ grid-template-columns: 1fr;/);
    expect(css).toMatch(/\.exampleCard \{ aspect-ratio:/);
  });
});
