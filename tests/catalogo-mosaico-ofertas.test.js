import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { DEAL_CARDS, PRODUCTS } from "../app/catalogo/vitrina-data";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";

const html = renderToStaticMarkup(createElement(ContactProvider, {
  contact: { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" },
}, createElement(CartProvider, null, createElement(CatalogoExperience))));

describe("mosaico de ofertas y destacados", () => {
  it("aparece justo después de fabricantes y antes de ventajas", () => {
    const marcas = html.indexOf('aria-label="Fabricantes que distribuimos"');
    const ofertas = html.indexOf('aria-labelledby="titulo-ofertas-destacadas"');
    const ventajas = html.indexOf('aria-label="Ventajas de comprar con Arconet"');
    expect(marcas).toBeGreaterThan(-1);
    expect(ofertas).toBeGreaterThan(marcas);
    expect(ventajas).toBeGreaterThan(ofertas);
    expect(html).toContain("Ofertas y destacados");
  });

  it("renderiza siete enlaces a fichas, categorías reales o contacto", () => {
    expect(DEAL_CARDS).toHaveLength(7);
    expect(DEAL_CARDS.filter(card => card.featured)).toHaveLength(1);
    for (const card of DEAL_CARDS) {
      expect(html).toContain(card.title);
      expect(html).toContain(`href="${card.href}"`);
      expect(card.href).toMatch(/^\/(catalogo\/ficha\/|tienda\/categoria\/|contacto$)/);
      if (card.image) expect(existsSync(`public${card.image}`)).toBe(true);
    }
  });

  it("solo etiqueta ofertas existentes y no inventa cupones ni promociones", () => {
    for (const card of DEAL_CARDS.filter(card => card.detail === "En oferta")) {
      expect(PRODUCTS.some(product => product.href === card.href && product.offer)).toBe(true);
    }
    expect(DEAL_CARDS.filter(card => card.detail === "En oferta")).toHaveLength(2);
    expect(DEAL_CARDS.map(card => `${card.title} ${card.detail}`).join(" ")).not.toMatch(/cup[oó]n|cashback|2x1/i);
  });

  it("usa una cuadrícula adaptable, sin fila desplazable nueva", () => {
    const css = readFileSync("app/catalogo/catalogo-experience.module.css", "utf8");
    const js = readFileSync("app/catalogo/catalogo-experience.js", "utf8");
    expect(css).toMatch(/\.dealGrid\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.dealGrid\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.dealTileFeatured\s*\{[^}]*grid-row: 1 \/ span 2/);
    expect(js).toContain('setChip("ofertas")');
    expect(js).toContain("onClick={verOfertas}");
  });
});
