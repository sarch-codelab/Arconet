import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn() } }));
import VentasSection from "../app/admin/ventas-section";
import CotizacionesSection from "../app/admin/cotizaciones-section";
import FacturacionPanel from "../app/admin/facturacion-panel";
import { allowedSalesCreationModes } from "../lib/admin-navigation";
import { ALL_PERMISSIONS } from "../lib/permisos";

const commercial = ["ordenes:read", "ordenes:write"];
const fiscal = ["facturacion:read", "facturacion:write"];
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, { orders: [], clientes: [], products: [], workers: [], ...props }));
const buttons = (html, label) => (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).filter(button => button.replace(/<[^>]*>/g, "").trim() === label);

describe("entrada única a la creación de ventas", () => {
  it.each([
    [ALL_PERMISSIONS, ["fiscal"]],
    [commercial, []],
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
    expect(buttons(html, "Cotizaciones")).toHaveLength(0);
    expect(buttons(html, "Facturas")).toHaveLength(0);
    expect(html).toContain("Listado de cotizaciones y ventas");
    expect(html).not.toContain("Nueva factura");
  });
  it.each([["ordenes:read"], ["facturacion:read"], ["precios:read"], []])("sólo lectura no ofrece creación: %j", permisos => {
    const html = render(VentasSection, { session: { permisos } });
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(buttons(html, "Nueva cotización")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
  });
  it("el componente de gestión conserva compatibilidad de consulta sin otra alta", () => {
    const html = render(FacturacionPanel, { activeTab: "facturas", saleEditorOpen: false, session: { permisos: fiscal } });
    for (const label of ["Documentos", "Libro de ventas", "Configuración"]) expect(buttons(html, label)).toHaveLength(1);
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
    expect(html).toContain("Crea desde Nueva venta");
    expect(html).not.toContain("Comprobante comercial");
  });
  it("Facturas tampoco ofrece una tercera alta si se renderiza sin el contenedor de Ventas", () => {
    const html = render(FacturacionPanel, { session: { permisos: fiscal } });
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(html).not.toContain("Nueva factura");
  });
  it("Nueva venta fiscal abre el editor existente y mantiene sus controles, sin crear una orden comercial", () => {
    const html = render(FacturacionPanel, { activeTab: "facturas", saleEditorOpen: true, session: { permisos: fiscal } });
    expect(html).toContain('aria-label="Nueva venta · Factura fiscal"');
    expect(html).toContain("Cerrar · conservar borrador");
    expect(html).toContain("Emitir factura");
    expect(html).toContain("Impuesto por defecto");
    expect(html).not.toContain("Buscar documentos");
    expect(html).not.toContain("Nueva factura");
  });
});

describe("corrección: factura directa en la emergente y sin píldora Facturas", () => {
  it("un rol comercial sin autorización fiscal sólo crea cotizaciones", () => {
    const html = render(VentasSection, { session: { permisos: commercial } });
    expect(buttons(html, "Nueva venta")).toHaveLength(0);
    expect(buttons(html, "Nueva cotización")).toHaveLength(1);
    expect(html).not.toContain("Comprobante comercial");
  });
  it("la entrada ya no monta el selector de comprobantes ni la píldora Facturas", () => {
    const html = render(VentasSection, { session: { permisos: ALL_PERMISSIONS } });
    expect(html).not.toContain("Elige el comprobante");
    expect(html).not.toContain("Comprobante comercial");
    expect(buttons(html, "Facturas")).toHaveLength(0);
    expect(buttons(html, "Documentos")).toHaveLength(0);
    expect(html).toContain("<dialog");
  });
  it("las acciones quedan después de la explicación en el mismo contenedor", () => {
    const html = render(VentasSection, { session: { permisos: ALL_PERMISSIONS } });
    const paragraph = html.indexOf("Crea cotizaciones o facturas fiscales");
    const action = html.indexOf('aria-label="Crear venta o cotización"');
    expect(action).toBeGreaterThan(paragraph);
    expect(html.slice(paragraph, action)).not.toContain("</div>");
  });
  it("el editor embebido mantiene ISV, conceptos y emisión, sin navegación a otro panel", () => {
    const html = render(FacturacionPanel, { embedded: true, hideTopbar: true, saleEditorOpen: true, session: { permisos: fiscal } });
    for (const label of ["ISV 15%", "ISV 18%", "Exento", "Emitir factura", "Añadir producto", "Añadir concepto / servicio"]) expect(html).toContain(label);
    expect(html).not.toContain("Secciones de facturación");
    expect(html).not.toContain("Volver a Facturas");
    expect(html).not.toContain("Buscar documentos");
    expect(html).not.toContain("Comprobante comercial");
  });
});


describe("consulta fiscal integrada sin convertir históricos", () => {
  const doc = { id: "FY-QA", tipo: "factura", fecha: "2026-10-30T18:00:00Z", estado: "emitido", total: 115, cliente: { nombre: "Cliente eventual", rtn: "" }, items: [] };
  it("el listado comparte facturas y comerciales pero nunca permite editar/eliminar una factura", () => {
    const html = render(CotizacionesSection, { fiscalDocuments: [doc], session: { permisos: [...commercial, ...fiscal, "ordenes:delete"] } });
    expect(html).toContain("Factura fiscal");
    expect(html).toContain("Pendiente de CAI · sin validez fiscal");
    expect(html).toContain('aria-label="Ver FY-QA"');
    expect(html).toContain('aria-label="Anular FY-QA"');
    expect(html).not.toContain('aria-label="Editar FY-QA"');
    expect(html).not.toContain('aria-label="Eliminar FY-QA"');
  });
  it("sólo lectura mantiene detalle e impresión sin anulación", () => {
    const html = render(CotizacionesSection, { fiscalDocuments: [doc], session: { permisos: ["facturacion:read"] } });
    expect(html).toContain('aria-label="Ver FY-QA"');
    expect(html).toContain('aria-label="Imprimir o guardar PDF de FY-QA"');
    expect(html).not.toContain('aria-label="Anular FY-QA"');
  });
  it("el contenedor fiscal no filtra históricos comerciales a un rol sin ordenes:read", () => {
    const html = render(VentasSection, { orders: [{ id: "COMERCIAL-PRIVADO-QA", tipo: "venta", cliente: "Privado", monto: 99 }], session: { permisos: fiscal } });
    expect(html).not.toContain("COMERCIAL-PRIVADO-QA");
  });
});
