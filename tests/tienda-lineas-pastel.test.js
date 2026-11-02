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
    // La imagen ocupa la placa, pero sin recortarse.
    expect(css).toMatch(/\.exampleVisual \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
    expect(css).toMatch(/\.exampleCopy \{[\s\S]*?z-index: 2;/);
    expect(css).toMatch(/\.exampleArrow \{[\s\S]*?border-radius: 50%;/);
  });

  // Las imágenes del panel pueden venir cuadradas, verticales o apaisadas.
  // Recortarlas a la placa (object-fit: cover) las dejaba cortadas.
  it("la imagen nunca se recorta, sea cual sea su proporción", () => {
    const css = readFileSync(CSS, "utf8");
    const bloque = css.match(/\.exampleImage \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toContain("object-fit: contain");
    expect(bloque).not.toContain("object-fit: cover");
    // Acotada a la placa para que no desborde.
    expect(bloque).toContain("max-height: 100%");
    // El contenedor debe ser flex: con grid la altura es indefinida y el
    // max-height de la imagen se ignora.
    const visual = css.match(/\.exampleVisual \{[\s\S]*?\n\}/)?.[0] || "";
    expect(visual).toContain("display: flex");
  });

  it("mantiene la placa pastel sin duplicar la imagen ni aplicar blur", () => {
    const css = readFileSync(CSS, "utf8");
    const js = readFileSync(JS, "utf8");
    const fondo = css.match(/\.exampleVisual::before \{[\s\S]*?\n\}/)?.[0] || "";
    // El fondo es un degradado estático: no vuelve a descargar la imagen
    // original ni crea una superficie filtrada por cada tarjeta.
    expect(fondo).toContain("linear-gradient(");
    expect(fondo).not.toContain("var(--imagen)");
    expect(fondo).not.toContain("filter: blur");
    expect(js).not.toContain('"--imagen"');
    // Se conserva el desvanecido de bordes de la imagen principal.
    expect(css).toMatch(/mask-image: radial-gradient\(/);
  });

  it("el efecto al pasar el puntero es profundidad, no zoom", () => {
    const css = readFileSync(CSS, "utf8");
    const hover = css.match(/\.exampleCard:hover \{[\s\S]*?\n\}/)?.[0] || "";
    expect(hover).toContain("translateY(-6px)");
    expect(hover).toContain("box-shadow");
    // La placa no se agranda al pasar el puntero.
    expect(hover).not.toContain("scale(");
    // La tarjeta arranca con sombra propia: sin ella no hay profundidad.
    const card = css.match(/\.exampleCard \{[\s\S]*?\n\}/)?.[0] || "";
    expect(card).toContain("box-shadow");
  });

  it("la tarjeta no pelea con la animación de entrada", () => {
    const js = readFileSync(JS, "utf8");
    // data-reveal escribe transform y anulaba la elevación del hover.
    const card = js.slice(js.indexOf("className={styles.exampleCard}"), js.indexOf("styles.exampleCopy"));
    // Como atributo JSX, no como mención en el comentario que lo explica.
    expect(card).not.toMatch(/\bdata-reveal\b\s*[\s>]/);
    // Las tarjetas no precargan todas las páginas dinámicas al hacer scroll.
    expect(card).toContain("prefetch={false}");
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

  it("el título se lee también sobre una foto oscura sin backdrop-filter", () => {
    const css = readFileSync(CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const bloque = css.match(/\.exampleCopy h3 \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toMatch(/background:\s*rgba\(255, 255, 255, 0\.88\)/);
    expect(bloque).not.toContain("backdrop-filter");
  });

  it("se adapta a móvil sin desbordar", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toMatch(/\.exampleGrid \{ grid-template-columns: 1fr;/);
    expect(css).toMatch(/\.exampleCard \{ aspect-ratio:/);
  });
});
