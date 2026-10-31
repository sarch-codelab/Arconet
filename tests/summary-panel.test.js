import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: {} }));
import ResumenSection, { SummaryContent } from "../app/admin/resumen-section";
import { summaryScope } from "../lib/summary-policy";
import { buildAdminSummary } from "../lib/admin-summary-service";
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const data = {
  legacy: [{ count: 1, amount: "90.00" }], legacyCount: 1,
  fiscal: [{ tipo: "factura", estado: "emitido", moneda: "HNL", _count: { _all: 1 }, _sum: { total: "115.00" } }],
  quotes: [{ estado: "pendiente", _count: { _all: 2 } }], pendingCai: 1, payments: { _sum: { monto: "25" } },
  workers: [{ estado: "activo", _count: { _all: 275 } }],
  recentWorkers: [{ id: "w", nombre: "PERSONAL-PRIVADO", puesto: "Técnico", ingreso: "2026-10-31" }],
  branches: [{ estado: "activo", _count: { _all: 1 } }], branchList: [{ id: "s", nombre: "SUCURSAL-PRIVADA", estado: "activo" }], branchWorkers: [{ sucursalId: "s", _count: { _all: 275 } }],
};
describe("componente real de Resumen por área", () => {
  it("Ventas presenta facturas y cotizaciones sin tarjetas ajenas o marcadores sin permiso", () => {
    const result = buildAdminSummary(summaryScope(["ordenes:read", "facturacion:read", "reportes:read"]), data);
    const html = render(SummaryContent, { data: result });
    expect(html).toContain("L 205.00"); expect(html).toContain("Facturas emitidas"); expect(html).toContain("Cotizaciones registradas");
    expect(html).not.toMatch(/PERSONAL-PRIVADO|SUCURSAL-PRIVADA|Sin permiso de consulta|Ingresos recientes|Distribución por sucursal/);
    expect(html).toContain("No equivale a cobros".toLowerCase());
  });
  it("Personal conserva contadores completos y sólo sus incorporaciones", () => {
    const html = render(SummaryContent, { data: buildAdminSummary(summaryScope(["trabajadores:read"]), data) });
    expect(html).toContain("275"); expect(html).toContain("PERSONAL-PRIVADO"); expect(html).toContain("Incorporaciones recientes de personal");
    expect(html).not.toMatch(/Facturas emitidas|Ventas registradas|SUCURSAL-PRIVADA|L 205/);
  });
  it("sucursales sin personal no crea contadores de trabajadores vacíos", () => {
    const html = render(SummaryContent, { data: buildAdminSummary(summaryScope(["sucursales:read"]), data) });
    expect(html).toContain("SUCURSAL-PRIVADA"); expect(html).not.toMatch(/trabajadores|PERSONAL-PRIVADO|Sin permiso/);
  });
  it("Bodega conserva su resumen de área sin tarjetas de ventas, personal ni costos", () => {
    const html = render(SummaryContent, { data: buildAdminSummary(summaryScope(["inventario:read"]), {}) });
    expect(html).toContain("Mi área · Inventario"); expect(html).not.toMatch(/Facturas emitidas|Ventas registradas|PERSONAL-PRIVADO|Costo|Valorizado/);
  });
  it("el HTML inicial no usa listas truncadas o datos privados recibidos por props", () => {
    const html = render(ResumenSection, { session: { correo: "ventas@qa.local", permisos: ["ordenes:read"] }, workers: data.recentWorkers, orders: [{ tipo: "venta", monto: 999999 }], sucursales: data.branchList });
    expect(html).toContain("Preparando tus indicadores autorizados"); expect(html).not.toMatch(/PERSONAL-PRIVADO|SUCURSAL-PRIVADA|999999|Sin permiso de consulta/);
  });
  it("un rol de ajustes tiene sus accesos sin tarjetas de datos ficticios", () => {
    const html = render(SummaryContent, { data: buildAdminSummary(summaryScope(["ajustes:read"]), {}) });
    expect(html).toContain("Tus accesos, en un solo lugar"); expect(html).toContain("Ajustes"); expect(html).toContain("Mi perfil");
    expect(html).not.toMatch(/Trabajadores registrados|Ventas registradas|data-summary-card/);
  });
  it("las píldoras sólo contienen grupos autorizados y filtran su contenido", () => {
    const result = buildAdminSummary(summaryScope(["ordenes:read", "trabajadores:read"]), data);
    const html = render(SummaryContent, { data: result, activeTab: "personal", onTabChange() {} });
    expect(html).toContain('aria-label="Secciones del resumen"'); expect(html).toContain("PERSONAL-PRIVADO");
    expect(html).not.toContain('data-summary-card="quotes"'); expect(html).not.toContain("Inventario");
  });
});


describe("navegación del resumen dentro del panel", () => {
  it("el enlace SPA usa sólo la transición del panel, no también la captura global de enlaces", () => {
    const result = buildAdminSummary(summaryScope(["trabajadores:read"]), data);
    const html = render(SummaryContent, { data: result, onNavigate() {} });
    expect(html).toContain('data-no-transition="true"');
    expect(html).toContain('aria-label="Abrir Personal"');
  });
});
