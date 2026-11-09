import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/catalogo/destacados", useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock("../app/tienda/catalogo-products", () => ({ useCatalogProducts: () => ({ products: [
  { id: "real-1", nombre: "Equipo de prueba", categoria: "Componentes pasivos", stock: 3, foto: "/catalogo/hero-fiber.jpg" },
  { id: "agotado", nombre: "Agotado", stock: 0 },
], loading: false, error: false }) }));

import { ContactProvider } from "../app/contact-provider";
import Destacados from "../app/catalogo/destacados/destacados";
import { metadata } from "../app/catalogo/destacados/page";

const contacto = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };
const html = renderToStaticMarkup(createElement(ContactProvider, { contact: contacto }, createElement(Destacados)));

describe("página para ver todos los productos destacados", () => {
  it("enlaza Ver todo desde la vitrina a la ruta dedicada", () => {
    const vitrina = readFileSync("app/catalogo/catalogo-experience.js", "utf8");
    expect(vitrina).toMatch(/<Link href="\/catalogo\/destacados" className=\{styles\.viewAll\}>\s*Ver todo/);
    expect(metadata.alternates.canonical).toBe("/catalogo/destacados");
  });

  it("muestra los seis editoriales y el inventario con existencias, con enlaces reales", () => {
    expect(html).toContain("Productos destacados");
    expect(html.match(/<article\b/g)).toHaveLength(7);
    expect(html).toContain('href="/catalogo/ficha/fusionadora"');
    expect(html).toContain('href="/tienda/producto/real-1"');
    expect(html).not.toContain("Agotado");
    expect(html.match(/medalla-destacado\.png/g)?.length).toBeGreaterThanOrEqual(7);
    expect(html).toContain("7 productos");
  });

  it("ofrece búsqueda, filtro de líneas y regreso al catálogo sin carrito ni precios", () => {
    expect(html).toContain("Buscar productos");
    expect(html).toContain("Otras líneas");
    expect(html).toContain('href="/catalogo#destacados"');
    expect(html).not.toContain("Abrir carrito");
    expect(html).not.toContain("Añadir al carrito");
  });
});
