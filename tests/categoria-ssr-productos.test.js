import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Prueba de render REAL (no solo lectura del archivo): la categoría debe
// entregar las tarjetas en el primer HTML, sin esperar a que el navegador
// hidrate y pida /api/catalogo. Así se reproduce la condición que dejaba la
// página "sin productos" cuando un chunk o un bloqueador fallaba.
vi.mock("next/navigation", () => ({
  usePathname: () => "/tienda/categoria/componentes-pasivos",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CategoryProducts from "../app/tienda/categoria/[slug]/category-products";
import { FAMILIES } from "../app/tienda/catalogo-data";

const CONTACTO = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };

const producto = (id, nombre, precio, stock) => ({
  id,
  nombre,
  sku: `SKU-${id}`,
  categoria: "Componentes pasivos",
  marca: "Arconet",
  garantia: "",
  unidad: "Unidad",
  descripcion: "",
  precio,
  stock,
  foto: "/catalogo/hero-fiber.jpg",
  fotos: [],
});

function renderCategoria(productosIniciales = []) {
  return renderToStaticMarkup(
    createElement(ContactProvider, { contact: CONTACTO },
      createElement(CartProvider, null,
        createElement(CategoryProducts, {
          slug: "componentes-pasivos",
          categoryName: "Componentes pasivos",
          productosIniciales,
        })
      )
    )
  );
}

describe("listado de categoría en el primer HTML", () => {
  it("todas las categorías empiezan con productos, sin imagen ni descripción de portada", () => {
    for (const family of FAMILIES) {
      const item = { ...producto("p-prueba", "Producto de prueba", 18, 2), categoria: family.category };
      const html = renderToStaticMarkup(createElement(ContactProvider, { contact: CONTACTO },
        createElement(CartProvider, null, createElement(CategoryProducts, {
          slug: family.slug, categoryName: family.category, productosIniciales: [item],
        }))));
      expect(html, family.slug).toContain("<h1>Productos disponibles</h1>");
      expect(html, family.slug).toContain("Producto de prueba");
      expect(html, family.slug).toContain("¿Necesitas ayuda con tu proyecto?");
      expect(html, family.slug).not.toContain(family.summary);
      expect(html, family.slug).not.toContain(family.description);
      expect(html, family.slug).not.toContain('class="category-products_hero');
    }
  });

  it("pinta todas las tarjetas recibidas del servidor", () => {
    const html = renderCategoria([
      producto("p-1", "Atenuador 03 dB", 18, 0),
      producto("p-2", "Conector de 90º ASKA", 15, 30),
      producto("p-3", "Splitter 1x8", 120, 5),
    ]);

    expect(html).toContain("Atenuador 03 dB");
    expect(html).toContain("Conector de 90º ASKA");
    expect(html).toContain("Splitter 1x8");
    expect(html).toContain("SKU-p-2");
    expect(html).toContain("3 referencias");
    expect(html).toContain("Agotado");
    expect(html).toContain("Añadir al Carrito");
    expect(html).not.toContain("Cargando productos");
  });

  it("mantiene el estado de carga solo cuando no hay nada que mostrar", () => {
    const html = renderCategoria([]);
    expect(html).toContain("Cargando productos");
    expect(html).not.toContain("SKU-p-2");
  });

  it("la sección de productos está en el HTML desde el primer render", () => {
    const html = renderCategoria([producto("p-1", "Atenuador 03 dB", 18, 2)]);
    // La clase base del revelado es visible por CSS (ver
    // tests/categoria-productos-visibles.test.js), así que basta con que la
    // sección y la tarjeta existan en el HTML para que se vean sin JS.
    expect(html).toContain('aria-label="Productos disponibles"');
    expect(html).toContain("Productos disponibles");
    expect(html).toContain("Atenuador 03 dB");
    expect(html).toContain("Ver detalle y cotizar");
  });
});
