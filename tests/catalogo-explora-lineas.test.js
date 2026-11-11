import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/catalogo", useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }), useSearchParams: () => new URLSearchParams() }));
import ExploraLineas, { productosDeSeccion, SECCIONES } from "../app/catalogo/explora-lineas";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { PRODUCTS } from "../app/catalogo/vitrina-data";
import { paginaDe, productosDeTienda } from "../app/catalogo/vitrina-paginacion";
import { leerVistos, registrarVisto, VISTOS_KEY } from "../app/catalogo/vistos-recientes";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";

const tienda = productosDeTienda(Array.from({ length: 8 }, (_, i) => ({ id: `equipo-${i}`, nombre: `Equipo ${i}`, categoria: "Componentes pasivos", stock: 5, creado: `2026-01-0${i + 1}T00:00:00Z`, foto: "/catalogo/hero-fiber.jpg" })));
const productos = [...PRODUCTS, ...tienda];
const render = props => renderToStaticMarkup(createElement(ExploraLineas, props));

describe("selecciones de equipos bajo las marcas", () => {
  it("muestra los seis textos de la referencia y novedades reales, sin precios ni reseñas inventadas", () => {
    const html = render({ productos, loading: false, error: false });
    for (const opcion of SECCIONES) expect(html).toContain(opcion.label);
    expect(html).toContain('aria-pressed="true">Novedades');
    expect(html).toContain('href="/tienda/producto/equipo-7"');
    expect(html.match(/<article/g)).toHaveLength(6);
    expect(html).not.toMatch(/heart|carrito|\$\d|L\s*\d/i);
    expect(html).not.toContain('>Componentes pasivos</button>');
  });
  it("ordena novedades por fecha real y pagina de seis", () => {
    const novedades = productosDeSeccion(productos, "novedades");
    expect(novedades.map(p => p.id)).toEqual(tienda.map(p => p.id).reverse());
    expect(paginaDe(novedades, 1).elementos).toHaveLength(2);
    expect(productosDeSeccion([{ ...tienda[0], creado: null }, ...PRODUCTS], "novedades")).toEqual([]);
  });
  it("no inventa recomendaciones, ventas, tendencias ni valoraciones", () => {
    for (const seccion of ["ia", "tendencia", "vendidos", "valorados"]) expect(productosDeSeccion(productos, seccion)).toEqual([]);
  });
  it("recuerda visitas de ambas fichas, en orden, y solo muestra productos disponibles", () => {
    const map = new Map(); const storage = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
    registrarVisto(storage, PRODUCTS[0].href); registrarVisto(storage, tienda[0].href); registrarVisto(storage, PRODUCTS[0].href);
    expect(leerVistos(storage)).toEqual([PRODUCTS[0].href, tienda[0].href]);
    expect(productosDeSeccion(productos, "vistos", leerVistos(storage))).toEqual([PRODUCTS[0], tienda[0]]);
    expect(productosDeSeccion(PRODUCTS, "vistos", leerVistos(storage))).toEqual([PRODUCTS[0]]);
    map.set(VISTOS_KEY, "no es json"); expect(leerVistos(storage)).toEqual([]);
    expect(() => registrarVisto({ getItem() { throw new Error(); }, setItem() { throw new Error(); } }, "/")).not.toThrow();
  });
  it("distingue carga, error y ausencia de novedades", () => {
    expect(render({ productos: [], loading: true, error: false })).toContain("Cargando equipos disponibles");
    expect(render({ productos: [], loading: false, error: true })).toContain("No pudimos cargar los equipos");
    expect(render({ productos: [], loading: false, error: false })).toContain("Todavía no hay novedades disponibles");
  });
  it("permanece tras las marcas y antes de las ofertas", () => {
    const html = renderToStaticMarkup(createElement(ContactProvider, { contact: { email: "test@example.com", phone: "0000", phoneHref: "tel:0000" } }, createElement(CartProvider, null, createElement(CatalogoExperience))));
    const marcas = html.indexOf('aria-label="Fabricantes que distribuimos"');
    const explora = html.indexOf('aria-labelledby="titulo-explora-lineas"');
    const ofertas = html.indexOf('aria-labelledby="titulo-ofertas-destacadas"');
    expect(marcas).toBeGreaterThan(-1); expect(explora).toBeGreaterThan(marcas); expect(ofertas).toBeGreaterThan(explora);
  });
  it("mantiene cuadrícula adaptable y solo flechas para avanzar", () => {
    const css = readFileSync("app/catalogo/catalogo-experience.module.css", "utf8");
    const js = readFileSync("app/catalogo/explora-lineas.js", "utf8");
    expect(css).toMatch(/\.exploraFilters\s*\{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.exploraGrid\s*\{[^}]*repeat\(6, minmax\(0, 1fr\)\)/);
    expect(css).toContain(".exploraGrid { grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(js).not.toMatch(/onWheel|onTouch|scrollBy|onPointer/);
  });
});
