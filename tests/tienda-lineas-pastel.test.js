import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El directorio conserva sus ilustraciones y datos administrados, pero separa
// la vitrina visual del texto para leer y recorrer las categorías con claridad.

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

describe("directorio profesional de líneas de producto", () => {
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

  it("ubica el título en la pestaña y la imagen delante de la cubierta", () => {
    const js = readFileSync(JS, "utf8");
    const css = readFileSync(CSS, "utf8");
    expect(js).toContain("<p>{example.text}</p>");
    expect(js).toContain("Explorar línea");
    expect(js).toContain("{examples.length} líneas disponibles");
    expect(js).toContain("styles.exampleIndex");
    expect(js).toContain("styles.folderTab");
    expect(js.indexOf("<h3>{example.title}</h3>")).toBeLessThan(js.indexOf("<div className={styles.exampleVisual}>"));
    expect(css).toContain("clip-path: polygon(");
    expect(css).toContain(".exampleCopy::before");
    const visual = css.match(/\.exampleVisual \{[\s\S]*?\n\}/)[0];
    expect(visual).toContain("position: relative");
    expect(visual).not.toContain("position: absolute");
    expect(css).toContain("margin-top: auto");
  });

  it("la imagen conserva su proporción y no pierde detalles con máscaras", () => {
    const css = readFileSync(CSS, "utf8");
    const image = css.match(/\.exampleImage \{[\s\S]*?\n\}/)[0];
    expect(image).toContain("object-fit: contain");
    expect(image).toContain("max-height: 100%");
    expect(image).not.toContain("mask-image");
    expect(image).not.toContain("filter");
    expect(image).toContain("box-shadow");
  });

  it("hover y foco son sutiles y respetan movimiento reducido", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("translateY(var(--folder-lift))");
    expect(css).toContain(".exampleCard:focus-visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(reduced).toContain("--folder-image-lift: -6px");
    expect(reduced).toContain("--folder-image-scale: 1;");
    expect(reduced).not.toMatch(/transition: none|transform: none/);
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
    expect(js).toContain('category.foto.startsWith("/media/")');
    // El orden importa: si la ilustración va primero, cambiar la foto en el
    // panel no tiene ningún efecto sobre la tarjeta.
    const bloque = js.slice(js.indexOf("const subida"), js.indexOf("/catalogo/hero-fiber.jpg"));
    const posFoto = bloque.indexOf("foto ||");
    const posArte = bloque.indexOf("LINE_ART[category.slug]");
    expect(posFoto).toBeGreaterThan(-1);
    expect(posArte).toBeGreaterThan(-1);
    expect(posFoto).toBeLessThan(posArte);
  });

  it("texto sobre superficie propia, legible en ambos temas", () => {
    const css = readFileSync(CSS, "utf8");
    const title = css.match(/\.folderTab h3 \{[\s\S]*?\n\}/)[0];
    expect(title).toContain("color: #fff");
    expect(title).not.toContain("line-clamp");
    expect(title).not.toContain("backdrop-filter");
    expect(css).toContain('--directory-surface: #151b23');
    expect(css).toContain('--directory-accent: #a9c3ff');
  });

  it("rejilla de tres, dos y una columnas sin alturas fijas de texto", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".exampleGrid { grid-template-columns: 1fr;");
    expect(css).not.toMatch(/\.exampleCard \{ aspect-ratio:/);
  });
});
