import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Los 6 cuadros que van encima de «Lo más buscado / Productos destacados»
// ahora son una cuadrícula de fotos a sangre con etiqueta, inspirada en el
// "Featured Category Grid" de la referencia y con imágenes de stock libre.

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { CATEGORY_CARDS } from "../app/catalogo/vitrina-data";

const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const CSS = "app/catalogo/catalogo-experience.module.css";
const leer = (ruta) => readFileSync(ruta, "utf8");
const CONTACTO = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };

const html = renderToStaticMarkup(
  createElement(ContactProvider, { contact: CONTACTO },
    createElement(CartProvider, null,
      createElement(CatalogoExperience)
    )
  )
);
const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

describe("la cuadrícula de categorías usa fotos reales de telecomunicaciones", () => {
  it("hay exactamente 6 cuadros, cada uno con foto propia y enlace real", () => {
    expect(CATEGORY_CARDS).toHaveLength(6);
    const nombres = CATEGORY_CARDS.map((c) => c.image.split("/").pop());
    expect(new Set(nombres).size).toBe(6);
    for (const tarjeta of CATEGORY_CARDS) {
      expect(tarjeta.title.length, tarjeta.title).toBeGreaterThan(3);
      expect(tarjeta.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tarjeta.image).toMatch(/^\/catalogo-vitrina\/categorias\/[a-z-]+\.webp$/);
      expect(tarjeta.href.startsWith("/tienda"), tarjeta.href).toBe(true);
    }
    expect(CATEGORY_CARDS.filter((c) => c.featured)).toHaveLength(1);
    expect(CATEGORY_CARDS.find((c) => c.featured).title).toBe("Ofertas");
  });

  it("los 6 WebP existen, son válidos y pesan poco", () => {
    for (const tarjeta of CATEGORY_CARDS) {
      const ruta = `public${tarjeta.image}`;
      const bytes = readFileSync(ruta);
      expect(bytes.subarray(0, 4).toString("ascii"), ruta).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii"), ruta).toBe("WEBP");
      expect(statSync(ruta).size, ruta).toBeGreaterThan(1000);
      expect(statSync(ruta).size, ruta).toBeLessThan(120000);
    }
  });

  it("el HTML trae las 6 fotos y las 6 etiquetas antes de hidratar", () => {
    expect(main).toContain('aria-label="Líneas de producto"');
    for (const tarjeta of CATEGORY_CARDS) {
      expect(main, tarjeta.image).toContain(tarjeta.image.split("/").pop());
      expect(main, tarjeta.title).toContain(tarjeta.title);
    }
    // Ya no aparecen los subtítulos ni la tarjeta de ofertas sin foto.
    expect(main).not.toContain("Conecta. Mide. Entrega.");
    expect(main).not.toContain("Precios de temporada");
    expect(main).not.toContain("Splitters y adaptadores.");
  });

  it("las fotos van a sangre con relleno, tinte y degradado, sin prioridad", () => {
    const js = leer(EXPERIENCIA);
    const css = leer(CSS);
    expect(js).toMatch(/<Image\s+src=\{card\.image\}/);
    expect(js).toContain('style={{ "--category-tint": card.tint }}');
    expect(css).toMatch(/\.categoryCard\s*\{[^}]*aspect-ratio: 1\.6 \/ 1/);
    expect(css).toMatch(/\.categoryImg\s*\{[^}]*object-fit: cover/);
    expect(css).toMatch(/\.categoryTint\s*\{[^}]*var\(--category-tint/);
    expect(css).toMatch(/\.categoryShade\s*\{[^}]*linear-gradient/);
    expect(css).toMatch(/\.categoryLabel\s*\{[^}]*z-index: 3/);
    // El antiguo diseño de miniatura + texto ya no existe.
    for (const vieja of [".categoryThumb", ".categoryCopy", ".categoryArrow", ".dealsIcon"]) {
      expect(css).not.toContain(vieja);
    }
    const imagenesCategoria = [...js.matchAll(/<Image[\s\S]{0,300}?\/>/g)]
      .map((m) => m[0])
      .filter((b) => b.includes("card.image"));
    expect(imagenesCategoria).toHaveLength(1);
    expect(imagenesCategoria[0]).not.toMatch(/\bpriority\b/);
  });

  it("las fuentes de las fotos quedan acreditadas en la documentación", () => {
    const docs = leer("docs/catalogo-vitrina.md");
    expect(docs).toContain("Pexels");
    expect(docs).toContain("Unsplash");
    expect(docs).toContain("Featured Category Grid");
  });
});
