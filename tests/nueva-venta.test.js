import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import NuevaVenta from "../app/admin/ventas/nueva/nueva-venta";
import CarritoCliente from "../app/admin/carrito-cliente";
import FacturacionPanel from "../app/admin/facturacion-panel";

const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

const fiscal = ["facturacion:read", "facturacion:write"];

describe("página completa de nueva venta", () => {
  it("con permiso fiscal muestra página entera con editor y carrito del cliente", () => {
    const html = render(NuevaVenta, { session: { nombre: "Admin QA", permisos: fiscal } });
    expect(html).toContain("Nueva venta · Factura fiscal");
    expect(html).toContain("Volver a Ventas");
    expect(html).toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).toContain("Emitir factura");
    expect(html).toContain("Carrito del cliente");
    expect(html).toContain("El carrito está vacío");
    expect(html).toContain("Sin cliente seleccionado");
    expect(html).not.toContain("Previsualización en vivo");
    expect(html).not.toContain("Factura fiscal · documento previo");
    // Página entera: nunca emergente.
    expect(html).not.toContain("<dialog");
  });

  it("sin permiso para emitir muestra aviso y no monta editor ni carrito", () => {
    const html = render(NuevaVenta, { session: { nombre: "Lectura", permisos: ["facturacion:read"] } });
    expect(html).toContain("No tienes permisos para crear una venta fiscal.");
    expect(html).not.toContain("Carrito del cliente");
    expect(html).not.toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).not.toContain("Emitir factura");
  });
});

describe("carrito del cliente en nueva venta", () => {
  const cliente = { id: "c1", nombre: "José <García>", rtn: "0801-1990-00001", telefono: "9000-0001" };
  const lineas = [{ key: "l1", productoId: "p1", kind: "producto", descripcion: "Equipo", cantidad: "2", precio: "100", descuento: "20", impuestoPorcentaje: "15" }];

  it("lista lo que lleva la venta y muestra totales con el nombre del cliente escapado", () => {
    const html = render(CarritoCliente, { cliente, lineas, onQuitarLinea: vi.fn() });
    expect(html).toContain("Carrito del cliente");
    expect(html).toContain("1 línea");
    expect(html).toContain("José &lt;García&gt;");
    expect(html).not.toContain("<García>");
    expect(html).toContain("Equipo");
    expect(html).toContain("2 × L 100.00");
    expect(html).toContain("Descuento: − L 20.00");
    expect(html).toContain("L 180.00"); // subtotal neto de la línea y del carrito
    expect(html).toContain("L 27.00"); // ISV 15%
    expect(html).toContain("L 207.00"); // total
    expect(html).toContain("ISV 15%");
    expect(html).toContain('aria-label="Quitar Equipo del carrito"');
    expect(html).not.toContain("Pendiente de CAI");
    expect(html).not.toContain("documento previo");
  });

  it("sin cliente ni líneas muestra un carrito vacío sin datos fiscales", () => {
    const html = render(CarritoCliente, {});
    expect(html).toContain("Sin cliente seleccionado");
    expect(html).toContain("El carrito está vacío");
    expect(html).toContain("0 líneas");
    expect(html).not.toContain("Pendiente de CAI");
  });
});

describe("FacturacionPanel con carrito", () => {
  it("muestra la columna del carrito sólo con el prop livePreview", () => {
    const base = { embedded: true, hideTopbar: true, saleEditorOpen: true, session: { permisos: fiscal } };
    const sinPreview = render(FacturacionPanel, { ...base, livePreview: false });
    const conPreview = render(FacturacionPanel, { ...base, livePreview: true });
    expect(sinPreview).not.toContain("Carrito del cliente");
    expect(conPreview).toContain("Carrito del cliente");
    expect(conPreview).toContain("El carrito está vacío");
    expect(conPreview).not.toContain("Factura fiscal · documento previo");
  });
});

describe("entrada a la página de nueva venta", () => {
  const page = readFileSync("app/admin/ventas/nueva/page.js", "utf8");
  const section = readFileSync("app/admin/ventas-section.js", "utf8");

  it("la ruta es un servidor que valida sesión y permisos", () => {
    expect(page).not.toContain('"use client"');
    expect(page).toContain("getSession");
    expect(page).toContain('redirect("/login")');
    expect(page).toContain("LocalPreviewEntry");
  });

  it("la ruta adjunta los permisos del rol a la sesión (la cookie no los trae)", () => {
    expect(page).toContain("getPermisos");
    expect(page).toContain("permisos");
    // Sin esto, el cierre del cliente siempre ve [] y niega al administrador.
  });

  it("la ruta aplica la preferencia de tema del panel (AdminPreferences)", () => {
    expect(page).toContain("AdminPreferences");
    // Sin esto, al entrar desde el panel en tema oscuro la página sale en blanco.
  });

  it("el botón Nueva venta abre la página completa, no una emergente", () => {
    expect(section).toContain('window.location.href = "/admin/ventas/nueva"');
  });
});
