import { existsSync, readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Debajo de «Lo más buscado / Productos destacados» va una vitrina de
// fabricantes con título centrado, flechas y tarjetas de logos, inspirada en
// el «Interactive Brand Showcase» de la referencia. Se reutilizan los mismos
// fabricantes y logotipos que la home: nada inventado ni logos nuevos.

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { BRANDS, REGALO_OFERTAS } from "../app/catalogo/vitrina-data";

const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const CSS = "app/catalogo/catalogo-experience.module.css";
const HOME_MARCAS = "app/home-marcas.js";
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

describe("la vitrina de fabricantes usa las marcas reales de Arconet", () => {
  it("son los 6 fabricantes que ya aparecen en la home", () => {
    expect(BRANDS).toHaveLength(6);
    const nombres = BRANDS.map((b) => b.name);
    expect(nombres).toEqual(["FiberHome", "Sumitomo", "Lindsay", "Joinwit", "PBI", "Belden"]);
    const home = leer(HOME_MARCAS);
    for (const nombre of nombres) expect(home, nombre).toContain(`"${nombre}"`);
    // No se inventan marcas de consumo ni se descargan logos de terceros.
    expect(nombres.join(" ")).not.toMatch(/Apple|Samsung|Nike|Adidas|Sony|Xiaomi|Logitech|Lego/i);
  });

  it("los 4 logos son PNG reales del repo y PBI/Belden van como texto", () => {
    const conLogo = BRANDS.filter((b) => b.logo);
    const sinLogo = BRANDS.filter((b) => !b.logo);
    expect(conLogo).toHaveLength(4);
    expect(sinLogo.map((b) => b.name)).toEqual(["PBI", "Belden"]);
    for (const marca of conLogo) {
      expect(marca.logo, marca.name).toMatch(/^\/marcas\/[a-z]+\.png$/);
      const ruta = `public${marca.logo}`;
      expect(existsSync(ruta), ruta).toBe(true);
      const bytes = readFileSync(ruta);
      expect(bytes.subarray(0, 8).toString("latin1"), ruta).toBe("\x89PNG\r\n\x1a\n");
      expect(statSync(ruta).size, ruta).toBeGreaterThan(1000);
    }
  });

  it("cada tarjeta enlaza a una ruta real de la tienda", () => {
    for (const marca of BRANDS) {
      expect(marca.href.startsWith("/tienda"), marca.name).toBe(true);
      expect(marca.href).not.toContain("#undefined");
    }
  });

  it("el bloque va justo debajo de Productos destacados y antes de Ventajas", () => {
    const productos = main.indexOf("Productos destacados");
    const marcas = main.indexOf("Marcas que distribuimos");
    const ventajas = main.indexOf("Envíos a todo Honduras");
    expect(productos).toBeGreaterThan(-1);
    expect(marcas).toBeGreaterThan(productos);
    expect(ventajas).toBeGreaterThan(marcas);
    expect(main).toContain('aria-label="Fabricantes que distribuimos"');
    expect(main).toContain('id="marcas"');
  });

  it("el primer HTML trae los 6 nombres, los 4 logos y las dos flechas", () => {
    for (const marca of BRANDS) {
      expect(main, marca.name).toContain(marca.name);
      if (marca.logo) expect(main, marca.logo).toContain(marca.logo.split("/").pop());
    }
    for (const etiqueta of ["Fabricantes anteriores", "Fabricantes siguientes"]) {
      expect(main).toContain(`aria-label="${etiqueta}"`);
    }
    expect(main.match(/Ver equipos de /g)).toHaveLength(6);
    // El regalo 3D de «Ofertas exclusivas para ti» sigue intacto.
    expect(main).toContain(REGALO_OFERTAS.split("/").pop());
    expect(main).toContain("Ofertas exclusivas para ti");
  });

  it("es una fila deslizante de tarjetas blancas, sin precarga ni gestos interceptados", () => {
    const js = leer(EXPERIENCIA);
    const css = leer(CSS);
    expect(css).toMatch(/\.brandRow\s*\{[^}]*display: flex/);
    expect(css).toMatch(/\.brandRow\s*\{[^}]*overflow-x: auto/);
    expect(css).toMatch(/\.brandRow\s*\{[^}]*scroll-snap-type: x mandatory/);
    expect(css).toMatch(/\.brandCard\s*\{[^}]*background: #fff/);
    expect(css).toMatch(/\.brandHead\s*\{[^}]*grid-template-columns: 1fr auto 1fr/);
    expect(css).toMatch(/@media \(max-width: 620px\)[\s\S]*\.brandCard \{ flex-basis: 52vw/);
    expect(js).toContain("desplazarFila(marcasFilaRef");
    expect(js).not.toMatch(/onWheel|onTouch|addEventListener\(\s*["']wheel/);
    expect(js).toContain("unoptimized");
    const bloques = [...js.matchAll(/<Image[\s\S]{0,300}?\/>/g)].map((m) => m[0]);
    const logos = bloques.filter((b) => b.includes("marca.logo"));
    expect(logos).toHaveLength(1);
    expect(logos[0]).not.toMatch(/\bpriority\b/);
    // Sin eager, Chromium no pide los logos que quedan fuera del scroller.
    expect(logos[0]).toContain('loading="eager"');
  });
});
