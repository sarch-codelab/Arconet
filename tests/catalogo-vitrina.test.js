import { existsSync, readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// /catalogo es una vitrina nueva e independiente inspirada en el diseño de
// referencia: misma estructura (buscador, chips, hero en diagonal, líneas,
// productos, ventajas, ideas, ofertas, boletín y cierre) con marca Arconet.
// Estas pruebas fijan la ruta, el contenido, que ningún enlace quede muerto y
// que el primer HTML ya traiga la página completa (sin depender de hidratación).

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import nextConfig from "../next.config.mjs";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import {
  BENEFITS,
  BRANDS,
  CATEGORY_CARDS,
  CHIPS,
  HERO_IMAGE,
  HERO_SLIDES,
  IDEAS,
  NAV_LINKS,
  PRODUCTS,
  PROMISES,
  REGALO_OFERTAS,
  SOBRE_NOVEDADES,
} from "../app/catalogo/vitrina-data";

const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const CSS = "app/catalogo/catalogo-experience.module.css";
const leer = (ruta) => readFileSync(ruta, "utf8");
const CONTACTO = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };

function renderVitrina() {
  return renderToStaticMarkup(
    createElement(ContactProvider, { contact: CONTACTO },
      createElement(CartProvider, null,
        createElement(CatalogoExperience)
      )
    )
  );
}

describe("la ruta /catalogo existe y no se la come una redirección", () => {
  it("tiene página, experiencia, estilos y metadatos", () => {
    expect(existsSync("app/catalogo/page.js")).toBe(true);
    expect(existsSync(EXPERIENCIA)).toBe(true);
    expect(existsSync(CSS)).toBe(true);
    const pagina = leer("app/catalogo/page.js");
    expect(pagina).toContain('title: "Catálogo"');
    expect(pagina).toContain('canonical: "/catalogo"');
    expect(pagina).toContain("<CatalogoExperience />");
  });

  it("la raíz ya no redirige pero las URLs antiguas siguen con 301", async () => {
    const origenes = Object.fromEntries((await nextConfig.redirects()).map((r) => [r.source, r]));
    expect(origenes["/catalogo"]).toBeUndefined();
    expect(origenes["/catalogo/categoria/:slug"]).toMatchObject({ destination: "/tienda/categoria/:slug", statusCode: 301 });
    expect(origenes["/catalogo/producto/:slug"]).toMatchObject({ destination: "/tienda/producto/:slug", statusCode: 301 });
    // Ningún comodín puede volver a tapar la página o las fotos de public/.
    for (const origen of Object.keys(origenes)) {
      expect(origen).not.toBe("/catalogo/:path*");
      expect(origen).not.toBe("/catalogo/:path");
    }
  });

  it("conserva /tienda intacta", async () => {
    expect(existsSync("app/tienda/catalogo-experience.js")).toBe(true);
    expect(leer("app/tienda/catalogo-experience.js")).toContain('variant="scroll"');
  });
});

describe("el contenido es de Arconet y no hay enlaces muertos", () => {
  it("todas las imágenes referenciadas existen en public/", () => {
    const rutas = [
      HERO_IMAGE,
      ...CATEGORY_CARDS.map((c) => c.image),
      ...PRODUCTS.map((p) => p.image),
      ...IDEAS.map((i) => i.image),
      SOBRE_NOVEDADES,
      REGALO_OFERTAS,
      ...BRANDS.filter((b) => b.logo).map((b) => b.logo),
    ];
    // 1 hero + 6 categorías + 6 productos + 5 ideas + 1 sobre + 1 regalo
    // + 4 logotipos de fabricantes.
    expect(rutas).toHaveLength(24);
    for (const ruta of rutas) {
      expect(existsSync(`public${ruta}`), `falta public${ruta}`).toBe(true);
      expect(statSync(`public${ruta}`).size, `vacío public${ruta}`).toBeGreaterThan(1000);
    }
  });

  it("cada tarjeta enlaza a una ruta real de la tienda", () => {
    const destinos = [
      ...CATEGORY_CARDS.map((c) => c.href),
      ...PRODUCTS.map((p) => p.href),
      ...IDEAS.map((i) => i.href),
      ...HERO_SLIDES.map((s) => s.href),
      ...NAV_LINKS.map((n) => n.href),
      ...BRANDS.map((b) => b.href),
    ];
    for (const destino of destinos) {
      expect(destino.startsWith("/"), destino).toBe(true);
      expect(destino).not.toContain("#undefined");
      expect(destino).not.toBe("/catalogo/categoria/");
      if (destino.startsWith("/tienda/categoria/")) {
        expect(destino.replace("/tienda/categoria/", "")).toMatch(/^[a-z0-9-]+$/);
      }
    }
    expect(destinos.some((d) => d === "/tienda")).toBe(true);
  });

  it("la vitrina tiene la misma estructura que el diseño de referencia", () => {
    expect(CHIPS).toHaveLength(7);
    expect(CATEGORY_CARDS).toHaveLength(6);
    expect(BRANDS).toHaveLength(6);
    expect(PRODUCTS).toHaveLength(6);
    expect(BENEFITS).toHaveLength(4);
    expect(IDEAS).toHaveLength(5);
    expect(PROMISES).toHaveLength(4);
    expect(HERO_SLIDES.length).toBeGreaterThan(1);
    // No se muestran precios ni contadores de "me gusta": la vitrina solo
    // presenta equipos y enlaza a /tienda para cotizar.
    for (const producto of PRODUCTS) {
      expect(producto).not.toHaveProperty("price");
      expect(producto).not.toHaveProperty("likes");
    }
    expect(PRODUCTS.some((p) => p.offer)).toBe(true);
  });
});

describe("el primer HTML ya trae la vitrina completa", () => {
  const html = renderVitrina();

  it("incluye buscador, navegación, hero, líneas y productos", () => {
    expect(html).toContain('role="search"');
    expect(html).toContain("Busca equipos, líneas y más...");
    expect(html).toContain('aria-label="Navegación principal"');
    expect(html).toContain("Productos destacados");
    expect(html).toContain("Fusionadora de fibra óptica");
    expect(html).toContain("Cable ADSS 24 hilos");
    expect(html).toContain("Novedades");
    expect(html).toContain("Ideas para tu próxima instalación");
    expect(html).toContain("Ofertas exclusivas para ti");
    expect(html).toContain("Recibe las novedades");
  });

  it("usa el logo de Arconet con sizes y prioridad baja, sin ?dpl=", () => {
    const logo = html.match(/<img[^>]*arconet\.png[^>]*>/)?.[0] || "";
    expect(logo).toContain("fetchPriority=\"low\"");
    expect(logo).not.toMatch(/\bpriority\b/);
    expect(logo).toContain("srcSet");
    expect(html).not.toContain("?dpl=");
    expect(html).toContain("Descubre. Equipa. Conecta.");
  });

  it("el hero y las tarjetas están en el HTML antes de hidratar", () => {
    expect(html).toContain("hero-banner");
    expect(html).toContain("Última tecnología");
    expect(html).toContain("en redes");
    expect(html.match(/href="\/tienda\/categoria\//g)?.length || 0).toBeGreaterThan(8);
  });

  it("el boletín no promete un backend inexistente", () => {
    const js = leer(EXPERIENCIA);
    expect(js).toContain('action="/contacto"');
    expect(js).toContain('method="get"');
    expect(js).toContain('name="correo"');
    expect(js).not.toContain("/api/suscripcion");
  });
});

describe("estilos: responsive, modo oscuro y contratos de imagen", () => {
  it("define los tres cortes de pantalla y el modo oscuro", () => {
    const css = leer(CSS);
    for (const corte of ["max-width: 1180px", "max-width: 900px", "max-width: 620px", "max-width: 400px"]) {
      expect(css).toContain(`@media (${corte})`);
    }
    expect(css).toContain(':global(html[data-theme="dark"]) .page');
    expect(css).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    // Productos e ideas van en una sola fila controlada por flechas.
    expect(css).toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*overflow-x: hidden/);
    expect(css).not.toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*scroll-snap-type/);
    expect(css).toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*display: flex/);
    expect(css).not.toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    // El contrato global de animaciones enumera los únicos CSS con bloque
    // reduced-motion; esta vitrina solo usa transiciones de hover, así que no
    // debe añadir uno nuevo sin actualizar tests/animaciones-siempre-activas.
    expect(css).not.toContain("prefers-reduced-motion");
    expect(css).not.toContain("@keyframes");
  });

  it("el logo de la cabecera no se pide a 3840px", () => {
    const js = leer(EXPERIENCIA);
    const bloque = js.match(/<Image[\s\S]{0,300}?\/arconet\.png[\s\S]{0,300}?\/>/)?.[0] || "";
    expect(bloque).toContain("sizes=");
    expect(bloque).toContain('fetchPriority="low"');
    expect(leer(CSS)).not.toMatch(/\.brandImg\s*\{[^}]*width:\s*clamp\(/);
  });

  it("solo la foto del hero es prioritaria", () => {
    const js = leer(EXPERIENCIA);
    const prioritarias = [...js.matchAll(/<Image[\s\S]{0,400}?\/>/g)]
      .map((m) => m[0])
      .filter((b) => /\bpriority\b/.test(b));
    expect(prioritarias).toHaveLength(1);
    expect(prioritarias[0]).toContain("HERO_IMAGE");
  });
});
