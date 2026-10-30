import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn() } }));
import ClienteSelector from "../app/admin/cliente-selector";
import ReferenciaSelector from "../app/admin/referencia-selector";
import FacturacionPanel from "../app/admin/facturacion-panel";
import PrecioSelector from "../app/admin/precio-selector";

const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const client = { id: "qa-c", nombre: 'José <García> "QA"', rtn: "0801-1990-00001", telefono: "9000-0001" };
const product = { id: "qa-p", nombre: "Equipo", sku: "QA-01", unidad: "Pieza", precio: 100, precioDescuento: 90, precioMayorista: 80, costo: "COSTO_PRIVADO", stock: "STOCK_PRIVADO" };

describe("selectores reales compartidos por Cotizaciones, Ventas y Facturación", () => {
  it("expone un combobox accesible, su selección y metadatos de identidad escapados", () => {
    const html = render(ClienteSelector, { value: client.id, fallback: client, session: { permisos: ["ordenes:write"] } });
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("0801-1990-00001"); expect(html).toContain("9000-0001");
    expect(html).toContain("José &lt;García&gt; &quot;QA&quot;");
    expect(html).not.toContain("<García>");
    expect(html).not.toContain("<select");
  });
  it("un snapshot sin metadatos muestra que está consultando, no una identificación o precio inventados", () => {
    const html = render(ReferenciaSelector, { kind: "clientes", value: "c", fallback: { id: "c", nombre: "José" } });
    expect(html).toContain("Consultando identificación guardada");
    expect(html).not.toContain("Sin identificación registrada");
  });
  it("crear clientes sigue exigiendo clientes:write, aun con permiso comercial", () => {
    const html = render(ClienteSelector, { session: { permisos: ["ordenes:write"] } });
    expect(html).not.toContain("+ Crear cliente");
    expect(html).toContain("Sin permiso para crear clientes");
    const authorized = render(ClienteSelector, { session: { permisos: ["facturacion:write", "clientes:write"] } });
    expect(authorized).toContain("+ Crear cliente eventual / nuevo");
    expect(authorized).not.toContain("Alta rápida de cliente");
  });
  it("un eventual sin RTN no recibe un documento inventado", () => {
    const html = render(ClienteSelector, { value: "eventual", fallback: { id: "eventual", nombre: "Cliente eventual", rtn: "" } });
    expect(html).toContain("Sin identificación registrada");
    expect(html).not.toContain("00000000000000");
  });
  it("el selector de producto sólo presenta SKU y tarifas de venta, nunca costo ni stock privado", () => {
    const html = render(ReferenciaSelector, { kind: "productos", value: product.id, fallback: product, onChange: () => {} });
    expect(html).toContain("QA-01"); expect(html).toContain("L 100.00");
    expect(html).not.toContain("COSTO_PRIVADO"); expect(html).not.toContain("STOCK_PRIVADO");
  });
  it("el catálogo vacío no deshabilita la construcción de la factura", () => {
    const html = render(FacturacionPanel, { activeTab: "nueva", session: { permisos: ["facturacion:read", "facturacion:write"] }, productos: [] });
    expect(html).toMatch(/<button(?:(?!<\/button>)[\s\S])*?>[\s\S]*?Añadir producto<\/button>/);
    const addButton = html.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?Añadir producto<\/button>/)?.[0];
    expect(addButton).toBeDefined(); expect(addButton).not.toContain('disabled=""');
    expect(html).toContain("Añadir concepto / servicio");
    expect(html).toContain('role="combobox"');
    expect(html).toMatch(/disabled=""[^>]*>[\s\S]*?Emitir factura/);
    expect(html).not.toContain("Créalos en la sección Clientes antes de facturar");
  });
  it("facturación de sólo lectura no permite emitir ni crear líneas", () => {
    const html = render(FacturacionPanel, { activeTab: "nueva", session: { permisos: ["facturacion:read"] } });
    expect(html).toMatch(/<fieldset[^>]*disabled=""/);
  });
  it("las tres tarifas y el snapshot histórico también respetan el bloqueo durante el guardado", () => {
    const html = render(PrecioSelector, { product, value: "normal", snapshot: 70, disabled: true });
    expect(html).toMatch(/<select[^>]*disabled=""/);
    expect(html).toContain("L 70.00 · guardado"); expect(html).toContain("L 90.00"); expect(html).toContain("L 80.00");
  });
});
