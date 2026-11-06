import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// El pie del carrito tenía cuatro botones apilados y se veía saturado. Se
// quitó "Enviar por correo" (el correo sigue disponible en /contacto y en el
// footer) y las tres acciones restantes pasaron a una fila horizontal.
vi.mock("next/navigation", () => ({
  usePathname: () => "/tienda",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../app/cart-context", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    useCart: () => ({
      items: [{
        key: "k1",
        slug: "p-1",
        href: "/tienda/producto/p-1",
        title: "Atenuador de prueba",
        category: "Componentes pasivos",
        presentation: "Unidad",
        quantity: 2,
        image: "",
      }],
      count: 2,
      isOpen: true,
      close: () => {},
      setQuantity: () => {},
      removeItem: () => {},
      clear: () => {},
    }),
  };
});

import CartDrawer from "../app/cart-drawer";

const JS = readFileSync("app/cart-drawer.js", "utf8");
const CSS = readFileSync("app/cart.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const regla = (selector) => CSS.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] || "";

describe("el carrito ya no ofrece correo", () => {
  it("no queda ningún enlace mailto ni la opción Enviar por correo", () => {
    expect(JS).not.toContain("Enviar por correo");
    expect(JS).not.toContain("mailto:");
    expect(JS).not.toContain("mailHref");
    expect(JS).not.toContain("SUBJECT");
    expect(JS).not.toContain("useContact");
    expect(JS).not.toContain("Mail");
  });

  it("el mensaje de error del portapapeles ya no recomienda el correo", () => {
    expect(JS).not.toMatch(/portapapeles[^"]*correo/i);
    expect(JS).toContain("Usa Generar cotización para abrir la vista previa");
  });

  it("conserva WhatsApp, cotización, copiar y vaciar", () => {
    for (const etiqueta of ["Enviar por WhatsApp", "Generar cotización", "Copiar pedido", "Vaciar carrito", "/api/cotizaciones/previo"]) {
      expect(JS).toContain(etiqueta);
    }
  });

  it("el carrito renderizado no contiene ningún mailto", () => {
    const html = renderToStaticMarkup(createElement(CartDrawer));
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("Enviar por correo");
    expect(html).toContain("Generar cotización");
    expect(html).toContain("Copiar pedido");
    // En el render del servidor WhatsApp aún no aparece (depende de
    // /api/site-config, que se pide al abrir): quedan solo las dos acciones
    // inmediatas, una al lado de la otra dentro de .actions.
    const acciones = html.match(/<div class="[^"]*_actions_[^"]*">([\s\S]*?)<\/div>/)?.[1] || "";
    expect((acciones.match(/_action_/g) || []).length).toBe(2);
    expect(acciones).toContain("Generar cotización");
    expect(acciones).toContain("Copiar pedido");
  });
});

describe("las acciones van una al lado de la otra", () => {
  it("el contenedor es una fila flexible que puede envolver", () => {
    const acciones = regla(".actions");
    expect(acciones).toMatch(/display:\s*flex/);
    expect(acciones).toMatch(/flex-wrap:\s*wrap/);
    expect(acciones).not.toMatch(/display:\s*grid/);
  });

  it("cada acción crece para compartir la fila y permite que el texto ajuste", () => {
    const accion = regla(".action");
    expect(accion).toMatch(/flex:\s*1 1 120px/);
    expect(accion).toContain("min-width: 0");
    expect(accion).toContain("overflow-wrap: anywhere");
    expect(accion).toContain("text-align: center");
  });
});
