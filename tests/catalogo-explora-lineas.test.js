import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/catalogo", useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }), useSearchParams: () => new URLSearchParams() }));
import ExploraLineas, { productosPorLinea } from "../app/catalogo/explora-lineas";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { PRODUCTS } from "../app/catalogo/vitrina-data";
import { paginaDe, productosDeTienda } from "../app/catalogo/vitrina-paginacion";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";

const tienda = productosDeTienda(Array.from({ length: 8 }, (_, i) => ({ id: `equipo-${i}`, nombre: `Equipo ${i}`, categoria: "Componentes pasivos", stock: 5, foto: "/catalogo/hero-fiber.jpg" })));
const productos = [...PRODUCTS, ...tienda];
const render = (props) => renderToStaticMarkup(createElement(ExploraLineas, props));

describe("exploración de equipos bajo las marcas", () => {
  it("muestra categorías reales y conserva los destinos sin inventar métricas ni precios", () => {
    const html = render({ productos, loading: false, error: false });
    expect(html).toContain("Explora nuestros equipos");
    expect(html).toContain('aria-label="Explorar equipos por línea"');
    expect(html).toContain('aria-pressed="true">Todas');
    expect(html).toContain('href="/tienda/producto/equipo-0"');
    expect(html.match(/<article/g)).toHaveLength(6);
    expect(html).not.toMatch(/IA recomend|más vendidos|mejor valorados|heart|carrito|\$\d|L\s*\d/i);
  });
  it("filtra de manera independiente por línea y pagina en grupos de seis", () => {
    expect(productosPorLinea(productos, "destacados")).toEqual(PRODUCTS);
    expect(productosPorLinea(productos, "todas")).toHaveLength(14);
    expect(productosPorLinea(productos, "todas")[0].origen).toBe("tienda");
    expect(paginaDe(productosPorLinea(productos, "todas"), 2).elementos[0].href).toMatch(/^\/catalogo\/ficha\//);
    expect(productosPorLinea(productos, "pasivos")).toHaveLength(8);
    expect(paginaDe(productosPorLinea(productos, "pasivos"), 1).elementos).toHaveLength(2);
    expect(productosPorLinea(productos, "ofertas").every(p => p.offer)).toBe(true);
    expect(productosPorLinea(productos, "gabinetes")[0].href).toMatch(/^\/catalogo\/ficha\//);
    expect(productosPorLinea(productos, "pasivos")[0].href).toBe("/tienda/producto/equipo-0");
  });
  it("distingue carga, error y ausencia de equipos", () => {
    expect(render({ productos: [], loading: true, error: false })).toContain("Cargando equipos disponibles");
    expect(render({ productos: [], loading: false, error: true })).toContain("No pudimos cargar los equipos");
    expect(render({ productos: [], loading: false, error: false })).toContain("No hay equipos disponibles");
  });
  it("se coloca inmediatamente tras las marcas sin quitar la vitrina de ofertas", () => {
    const html = renderToStaticMarkup(createElement(ContactProvider, { contact: { email: "test@example.com", phone: "0000", phoneHref: "tel:0000" } }, createElement(CartProvider, null, createElement(CatalogoExperience))));
    const marcas = html.indexOf('aria-label="Fabricantes que distribuimos"');
    const explora = html.indexOf('aria-labelledby="titulo-explora-lineas"');
    const ofertas = html.indexOf('aria-labelledby="titulo-ofertas-destacadas"');
    expect(marcas).toBeGreaterThan(-1); expect(explora).toBeGreaterThan(marcas); expect(ofertas).toBeGreaterThan(explora);
    const js = readFileSync("app/catalogo/catalogo-experience.js", "utf8");
    expect(js).toMatch(/<\/section>\s*<ExploraLineas productos=\{destacados\}/);
  });
  it("usa filtros sin carrusel y una cuadrícula adaptable", () => {
    const css = readFileSync("app/catalogo/catalogo-experience.module.css", "utf8");
    const js = readFileSync("app/catalogo/explora-lineas.js", "utf8");
    expect(css).toMatch(/\.exploraFilters\s*\{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.exploraGrid\s*\{[^}]*repeat\(6, minmax\(0, 1fr\)\)/);
    expect(css).toContain(".exploraGrid { grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(js).not.toMatch(/onWheel|onTouch|scrollBy|onPointer/);
  });
});
