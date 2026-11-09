import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Ajustes pedidos sobre la vitrina azul: el sobre es la imagen aportada,
// productos e ideas van en una sola fila con flechas y desaparecen los precios,
// el carrito y los corazones de ESTA página (no de /tienda ni del layout).

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { PRODUCTS, SOBRE_NOVEDADES } from "../app/catalogo/vitrina-data";

const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const DATOS = "app/catalogo/vitrina-data.js";
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

describe("el boletín usa la imagen del sobre aportada", () => {
  it("el archivo es un WebP con transparencia y está referenciado", () => {
    const ruta = `public${SOBRE_NOVEDADES}`;
    const bytes = readFileSync(ruta);
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(ruta).size).toBeGreaterThan(1000);
    expect(leer(EXPERIENCIA)).toContain("<Image src={SOBRE_NOVEDADES}");
    expect(leer(EXPERIENCIA)).toContain("SOBRE_NOVEDADES");
    expect(html).toContain("sobre-novedades.webp");
  });

  it("ya no se dibuja el sobre con CSS ni con el icono Mail", () => {
    const css = leer(CSS);
    expect(css).not.toContain(".envelope::before");
    expect(css).not.toMatch(/\.envelope\s*\{[^}]*background:/);
    expect(css).not.toMatch(/\.envelope\s*\{[^}]*box-shadow:/);
    expect(css).toMatch(/\.envelopeImg\s*\{[^}]*object-fit: contain/);
    expect(leer(EXPERIENCIA)).not.toContain("<Mail size={30}");
    expect(main).toContain("Recibe las novedades");
  });
});

describe("productos e ideas van en una sola fila con flechas", () => {
  it("ambas secciones usan contenedores flex desplazables solo con flechas", () => {
    const js = leer(EXPERIENCIA);
    const css = leer(CSS);
    expect(js).toContain("className={styles.productRow}");
    expect(js).toContain("className={styles.ideaRow}");
    expect(js).not.toContain("styles.productGrid");
    expect(js).not.toContain("styles.ideaGrid");
    expect(css).toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*display: flex/);
    expect(css).toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*overflow-x: hidden/);
    expect(css).not.toMatch(/\.productRow,\s*\.ideaRow\s*\{[^}]*scroll-snap-type/);
    expect(css).toMatch(/\.productCard\s*\{[^}]*flex: 0 0 /);
    expect(css).toMatch(/\.ideaCard\s*\{[^}]*flex: 0 0 /);
    expect(css).not.toContain(".productRow::-webkit-scrollbar");
    expect(css).not.toContain(".ideaRow::-webkit-scrollbar");
    // Ya no hay rejillas de 6/5 columnas para estas dos secciones.
    expect(css).not.toContain(".productGrid");
    expect(css).not.toContain(".ideaGrid");
    expect(css).not.toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(css).not.toContain(".ideaCard:last-child");
  });

  it("las flechas desplazan sin interceptar gestos", () => {
    const js = leer(EXPERIENCIA);
    for (const etiqueta of ["Productos anteriores", "Productos siguientes", "Ideas anteriores", "Ideas siguientes"]) {
      expect(js).toContain(`aria-label="${etiqueta}"`);
      expect(main).toContain(`aria-label="${etiqueta}"`);
    }
    expect(js).toContain("desplazarFila(productosFilaRef");
    expect(js).toContain("desplazarFila(ideasFilaRef");
    expect(leer("app/catalogo/desplazar-fila.js")).toContain('fila.scrollTo({ left: destino, behavior: "instant" })');
    expect(js).not.toMatch(/onWheel|onTouch|addEventListener\(\s*["']wheel/);
  });

  it("el primer HTML trae las 6 tarjetas de producto y las 5 ideas en la fila", () => {
    expect(main).toContain("Productos destacados");
    expect(main).toContain("Ideas para tu próxima instalación");
    expect(main).toContain("Fusionadora de fibra óptica");
    expect(main).toContain("Cable ADSS 24 hilos");
    expect(main).toContain("Instalaciones FTTH");
    expect(main).toContain("Redes empresariales");
  });
});

describe("sin precios, carrito ni corazones en /catalogo", () => {
  it("PRODUCTS ya no tiene price ni likes", () => {
    expect(PRODUCTS).toHaveLength(6);
    for (const producto of PRODUCTS) {
      expect(producto).not.toHaveProperty("price");
      expect(producto).not.toHaveProperty("likes");
    }
    const datos = leer(DATOS);
    expect(datos).not.toContain("price:");
    expect(datos).not.toContain("likes:");
    expect(datos).not.toContain('"heart"');
  });

  it("el componente no importa Heart, ShoppingCart ni useCart", () => {
    const js = leer(EXPERIENCIA);
    expect(js).not.toMatch(/import\s*\{[^}]*\bHeart\b/);
    expect(js).not.toMatch(/import\s*\{[^}]*\bShoppingCart\b/);
    expect(js).not.toContain("useCart");
    expect(js).not.toContain("formatoLikes");
    expect(js).not.toContain("favoritos");
    expect(js).not.toContain("alternarFavorito");
    expect(js).not.toContain("styles.price");
    expect(js).not.toContain("styles.like");
  });

  it("el HTML de la vitrina no muestra precios ni controles de compra", () => {
    expect(main).not.toContain("L 42,800.00");
    expect(main).not.toContain("L 36,500.00");
    expect(main).not.toMatch(/L\s[\d,]+\.\d{2}/);
    expect(main).not.toContain("Abrir carrito");
    expect(main).not.toContain("Ver favoritos");
    expect(main).not.toContain("Guardar en favoritos");
    expect(main).not.toContain("Quitar de favoritos");
    expect(main).not.toContain("lucide-heart");
    expect(main).not.toContain("lucide-shopping-cart");
    // El acceso a cuenta sí se conserva.
    expect(main).toContain('aria-label="Acceder a mi cuenta"');
  });

  it("el carrito compartido y /tienda siguen intactos", () => {
    expect(leer("app/layout.js")).toContain("<CartDrawer />");
    expect(leer("app/layout.js")).toContain("<CartProvider>");
    expect(leer("app/cart-context.js")).toContain("CartProvider");
    expect(leer("app/tienda/catalogo-experience.js")).not.toBe("");
  });
});
