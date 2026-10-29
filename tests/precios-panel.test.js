import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn() } }));
import PreciosPanel from "../app/admin/precios-panel";
import PrecioSelector from "../app/admin/precio-selector";
import VentasSection from "../app/admin/ventas-section";
const product = {
  id: "p",
  nombre: "Equipo QA",
  sku: "SKU-QA",
  estado: "activo",
  precio: 100,
  precioDescuento: 90,
  precioMayorista: 80,
};
const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));
describe("renderizado real de precios y acceso a Ventas", () => {
  it.each([["precios:read"], ["precios:read", "precios:write"]])(
    "muestra tres valores distintos y permisos de edición: %s",
    (permisos) => {
      const html = render(PreciosPanel, {
        products: [product],
        session: { permisos },
      });
      for (const label of [
        "Valor 1 · Normal",
        "Valor 2 · Descuento",
        "Valor 3 · Mayorista",
        "L 100.00",
        "L 90.00",
        "L 80.00",
      ])
        expect(html).toContain(label);
      expect(html.includes("Editar precios e historial")).toBe(
        permisos.includes("precios:write"),
      );
      expect(html.includes("Consultar historial")).toBe(
        !permisos.includes("precios:write"),
      );
    },
  );
  it("un rol solo de precios monta su pestaña, no Cotizaciones ni Facturas", () => {
    const html = render(VentasSection, {
      products: [product],
      session: { permisos: ["precios:read"] },
    });
    expect(html).toContain("Precios de venta");
    expect(html).not.toContain("Nueva cotización");
    expect(html).not.toContain("Facturación fiscal");
  });
  it("no inventa precios opcionales y permite identificar el snapshot histórico", () => {
    const html = render(PrecioSelector, {
      product: { ...product, precioDescuento: null },
      value: "normal",
      snapshot: 70,
    });
    expect(html).toContain("L 70.00 · guardado");
    expect(html).toMatch(/value="descuento" disabled=""/);
    expect(html).toContain("Sin configurar");
  });
});
