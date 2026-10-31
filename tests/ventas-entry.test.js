import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn() } }));
import VentasSection from "../app/admin/ventas-section";
import FacturacionPanel from "../app/admin/facturacion-panel";
import { allowedSalesCreationModes } from "../lib/admin-navigation";
import { ALL_PERMISSIONS } from "../lib/permisos";

const commercial = ["ordenes:read", "ordenes:write"];
const fiscal = ["facturacion:read", "facturacion:write"];
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, { orders: [], clientes: [], products: [], workers: [], ...props }));
const buttons = (html, label) => (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).filter(button => button.replace(/<[^>]*>/g, "").trim() === label);

describe("entrada única a la creación de ventas", () => {
  it.each([
    [ALL_PERMISSIONS, ["comercial", "fiscal"]],
    [commercial, ["comercial"]],
    [fiscal, ["fiscal"]],
    [["ordenes:read", "facturacion:read"], []],
    [["ordenes:write", "facturacion:write"], []],
    [["precios:read", "precios:write"], []],
    [null, []],
    [undefined, []],
  ])("crear exige lectura/escritura del ámbito correspondiente: %j", (permissions, expected) => {
    expect(allowedSalesCreationModes(permissions)).toEqual(expected);
  });
  it("administración tiene exactamente Nueva venta y Nueva cotización, sin tercera alta fiscal", () => {
    const html = render(VentasSection, { session: { permisos: ALL_PERMISSIONS } });
    expect(buttons(html, "Nueva venta")).toHaveLength(1);
    expect(buttons(html, "Nueva cotización")).toHaveLength(1);
    expect(html).not.toContain("Nueva factura");
    expect(html).not.toContain("se emiten en la pestaña Facturas");
  });
  it("el rol fiscal entra por Nueva venta sin montar ni ofrecer el flujo comercial", () => {
    const html = render(VentasSection, { session: { permisos: fiscal } });
    expect(buttons(html, "Nueva venta")).toHaveLength(1);
    expect(html).not.toContain("Nueva cotización");
    expect(html).not.toContain("Resumen de cotizaciones");
    expect(html).toContain("Ventas · Facturas");
    expect(html).not.toContain("Nueva factura");
  });
  it.each([["ordenes:read"], ["facturacion:read"], ["precios:read"], []])("sólo lectura no ofrece creación: %j", permisos => {
    const html = render(VentasSection, { session: { permisos } });
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(buttons(html, "Nueva cotización")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
  });
  it("Facturas administrado por Ventas sólo expone registro, libro y configuración", () => {
    const html = render(FacturacionPanel, { activeTab: "facturas", saleEditorOpen: false, session: { permisos: fiscal } });
    for (const label of ["Documentos", "Libro de ventas", "Configuración"]) expect(buttons(html, label)).toHaveLength(1);
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
    expect(html).toContain("Crea desde Nueva venta");
    expect(html).toContain("no numera retroactivamente");
  });
  it("Facturas tampoco ofrece una tercera alta si se renderiza sin el contenedor de Ventas", () => {
    const html = render(FacturacionPanel, { session: { permisos: fiscal } });
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
  });
  it("Nueva venta fiscal abre el editor existente y mantiene sus controles, sin crear una orden comercial", () => {
    const html = render(FacturacionPanel, { activeTab: "facturas", saleEditorOpen: true, session: { permisos: fiscal } });
    expect(html).toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).toContain("Volver a Facturas · conservar borrador");
    expect(html).toContain("Emitir factura");
    expect(html).toContain("Impuesto por defecto");
    expect(html).not.toContain("Buscar documentos");
    expect(html).not.toContain("Nueva factura");
  });
});
