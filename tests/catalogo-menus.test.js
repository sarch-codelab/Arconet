import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { coincideBusqueda, sugerirDestacados } from "../app/catalogo/busqueda-destacados";
import { PRODUCTS } from "../app/catalogo/vitrina-data";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";

const html = renderToStaticMarkup(createElement(ContactProvider, {
  contact: { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" },
}, createElement(CartProvider, null, createElement(CatalogoExperience))));
const js = readFileSync("app/catalogo/catalogo-experience.js", "utf8");

describe("búsqueda y menús del catálogo", () => {
  it("sugiere solo productos existentes, sin distinguir mayúsculas ni tildes", () => {
    expect(sugerirDestacados(PRODUCTS, "  FUSIONADORA  ").map(p => p.id)).toEqual(["fusionadora"]);
    expect(sugerirDestacados(PRODUCTS, "medicion optica").map(p => p.id)).toEqual(["fusionadora", "otdr", "powermeter"]);
    expect(sugerirDestacados(PRODUCTS, "inexistente")).toEqual([]);
    expect(sugerirDestacados(PRODUCTS, "   ")).toEqual([]);
    expect(coincideBusqueda(PRODUCTS[0], "")).toBe(true);
    expect(sugerirDestacados(PRODUCTS, "otdr")[0].href).toBe("/catalogo/ficha/otdr");
  });

  it("los menús son botones accesibles y el alcance de búsqueda se indica", () => {
    expect(html).toContain("Buscar en el catálogo");
    expect(html).toContain("Busca entre los seis productos destacados");
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>[^<]*<svg[^>]*>[\s\S]*?Categorías/);
    expect(html).toContain('aria-label="Acceder a mi cuenta"');
    expect(js).toContain('event.key === "Escape"');
    expect(js).toContain('event.key === "ArrowDown"');
    expect(js).toContain("event.currentTarget.contains(event.relatedTarget)");
  });

  it("categorías reutiliza filtros existentes y cuenta usa la sesión real", () => {
    expect(js).toContain("onClick={() => elegirCategoria(item.id)}");
    expect(js).toContain('setChip("todas")');
    expect(js).toContain('fetch("/api/cliente-auth/session", { cache: "no-store" })');
    expect(js).toContain('fetch("/api/cliente-auth/logout", { method: "POST" })');
    expect(js).toContain('respuesta.status === 401');
    expect(js).toContain('href="/cliente"');
    expect(js).toContain('href="/login"');
    expect(js).toContain('href="/registro"');
    expect(js).toContain("No se pudo consultar tu cuenta");
  });
});
