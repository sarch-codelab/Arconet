import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import NuevaVenta from "../app/admin/ventas/nueva/nueva-venta";
import FacturaPreview from "../app/admin/factura-preview";
import FacturacionPanel from "../app/admin/facturacion-panel";

const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

const fiscal = ["facturacion:read", "facturacion:write"];

describe("página completa de nueva venta", () => {
  it("con permiso fiscal muestra página entera con editor y previsualización en vivo", () => {
    const html = render(NuevaVenta, { session: { nombre: "Admin QA", permisos: fiscal } });
    expect(html).toContain("Nueva venta · Factura fiscal");
    expect(html).toContain("Volver a Ventas");
    expect(html).toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).toContain("Emitir factura");
    expect(html).toContain("Previsualización en vivo");
    expect(html).toContain("Factura fiscal · documento previo");
    expect(html).toContain("Sin cliente seleccionado todavía");
    // Página entera: nunca emergente.
    expect(html).not.toContain("<dialog");
  });

  it("sin permiso para emitir muestra aviso y no monta editor ni previsualización", () => {
    const html = render(NuevaVenta, { session: { nombre: "Lectura", permisos: ["facturacion:read"] } });
    expect(html).toContain("No tienes permisos para crear una venta fiscal.");
    expect(html).not.toContain("Previsualización en vivo");
    expect(html).not.toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).not.toContain("Emitir factura");
  });
});

describe("previsualización en vivo de la factura", () => {
  const cliente = { id: "c1", nombre: "José <García>", rtn: "0801-1990-00001", telefono: "9000-0001" };
  const lineas = [{ key: "l1", descripcion: "Equipo", cantidad: "2", precio: "100", descuento: "20", impuestoPorcentaje: "15" }];

  it("calcula por línea y muestra totales con el nombre del cliente escapado", () => {
    const html = render(FacturaPreview, { cliente, lineas });
    expect(html).toContain("Previsualización en vivo");
    expect(html).toContain("José &lt;García&gt;");
    expect(html).not.toContain("<García>");
    expect(html).toContain("Equipo");
    expect(html).toContain("L 200.00"); // importe antes de descuentos
    expect(html).toContain("L 180.00"); // subtotal neto
    expect(html).toContain("L 27.00"); // ISV 15%
    expect(html).toContain("L 207.00"); // total
    expect(html).toContain("ISV 15%");
  });

  it("sin cliente ni líneas muestra estado vacío sin inventar datos", () => {
    const html = render(FacturaPreview, {});
    expect(html).toContain("Sin cliente seleccionado todavía");
    expect(html).toContain("Aún no hay líneas");
    expect(html).toContain("Pendiente de CAI");
  });
});

describe("FacturacionPanel con previsualización", () => {
  it("mostrando la columna de previsualización sólo con el prop livePreview", () => {
    const base = { embedded: true, hideTopbar: true, saleEditorOpen: true, session: { permisos: fiscal } };
    const sinPreview = render(FacturacionPanel, { ...base, livePreview: false });
    const conPreview = render(FacturacionPanel, { ...base, livePreview: true });
    expect(sinPreview).not.toContain("Previsualización en vivo");
    expect(conPreview).toContain("Previsualización en vivo");
    expect(conPreview).toContain("Factura fiscal · documento previo");
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

  it("el botón Nueva venta abre la página completa, no una emergente", () => {
    expect(section).toContain('window.location.href = "/admin/ventas/nueva"');
  });
});
