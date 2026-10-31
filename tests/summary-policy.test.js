import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, PERMISSION_MODULES, canAccessSection, canReadScopedSummary } from "../lib/permisos";
import { defaultAdminSection } from "../lib/admin-navigation";
import { DEFAULT_SALES_PERMISSIONS } from "../lib/roles-defaults";
import { summaryScope, summaryLinks, summaryTargetUrl, moneyCents, centsMoney, formatSummaryMoney, summarizeSalesAggregates } from "../lib/summary-policy";

const row = (tipo, total, count = 1, estado = "emitido", moneda = "HNL") => ({ tipo, estado, moneda, _count: { _all: count }, _sum: { total } });

describe("Resumen por permisos, no por nombres de roles", () => {
  it.each(PERMISSION_MODULES.filter(m => m.actions.includes("read")).map(m => [m.id]))("%s:read permite un resumen de su área, no reportes globales", id => {
    expect(canReadScopedSummary([`${id}:read`])).toBe(true);
    expect(canAccessSection([`${id}:read`], "resumen")).toBe(true);
    expect(summaryScope([`${id}:read`]).reports).toBe(id === "reportes");
  });
  it.each([null, undefined, [], ["productos:write"], ["inventario:write"], ["desconocido:read"], ["mi-perfil:read"], "reportes:read"].map(p => [p]))("sin lectura de áreas no amplía %j", permisos => {
    expect(canReadScopedSummary(permisos)).toBe(false);
  });
  it("reportes por sí solo no concede personal, inventario, clientes ni facturas", () => {
    expect(summaryScope(["reportes:read"])).toMatchObject({ allowed: true, reports: true, workers: false, inventory: false, customers: false, fiscal: false, commercial: false });
  });
  it("conserva los destinos iniciales existentes y el acceso explícito al nuevo resumen", () => {
    expect(defaultAdminSection(["precios:read"])).toBe("ventas");
    expect(defaultAdminSection(["productos:read"])).toBe("inventario");
    expect(defaultAdminSection(["inventario:read"])).toBe("resumen");
    expect(defaultAdminSection(["ordenes:read"], "resumen")).toBe("resumen");
    expect(defaultAdminSection([], "resumen")).toBe("mi-perfil");
  });
  it("Ventas no recibe accesos de personal, CAI, compras, ajustes ni logs globales", () => {
    const links = summaryLinks(summaryScope(DEFAULT_SALES_PERMISSIONS)).map(link => link.id);
    expect(links).toEqual(["ventas", "clientes", "productos", "mi-perfil"]);
  });
  it("Bodega conserva sus registros propios sin necesitar logs o reportes globales", () => {
    const scope = summaryScope(["inventario:read"]);
    expect(summaryLinks(scope)).toEqual([{ id: "inventario", label: "Inventario", target: "inventario" }, { id: "logs", label: "Registros de Inventario", target: "logs" }, { id: "mi-perfil", label: "Mi perfil", target: "mi-perfil" }]);
    expect(scope.reports).toBe(false); expect(scope.logs).toBe(false);
  });
  it("los lectores de precios y compradores tienen enlaces válidos a su módulo", () => {
    expect(summaryLinks(summaryScope(["precios:read"]))[0]).toMatchObject({ label: "Precios de venta", target: "ventas" });
    expect(summaryTargetUrl("compras")).toBe("/panel-administrativo?section=inventario&view=compras");
    expect(summaryTargetUrl("productos")).toBe("/panel-administrativo?section=inventario&view=productos");
  });
});

describe("totales fiscales y comerciales sin mezclar monedas ni cobros", () => {
  it("suma el histórico neto ya deduplicado, facturas y ajustes; no suma cotizaciones", () => {
    const result = summarizeSalesAggregates({ legacy: { count: 2, amount: "90.10" }, fiscal: [row("factura", "115.15", 3), row("nota_credito", "5.05"), row("nota_debito", "2.10"), row("factura", "99999", 4, "anulado")], financial: true });
    expect(result).toMatchObject({ sales: 5, invoices: 3, credits: 1, debits: 1, cancelled: 4, amounts: [{ currency: "HNL", amount: "202.30" }] });
  });
  it("separa HNL y USD sin inventar un tipo de cambio", () => {
    expect(summarizeSalesAggregates({ legacy: { count: 1, amount: "90.00" }, fiscal: [row("factura", "115"), row("factura", "20", 1, "emitido", "USD"), row("nota_credito", "5", 1, "emitido", "USD")], financial: true }).amounts)
      .toEqual([{ currency: "HNL", amount: "205.00" }, { currency: "USD", amount: "15.00" }]);
  });
  it("sólo cantidades no lee siquiera los importes brutos", () => {
    const fiscal = row("factura", "SECRETO");
    Object.defineProperty(fiscal, "_sum", { get() { throw new Error("No leer dinero"); } });
    const result = summarizeSalesAggregates({ legacy: { count: 1 }, fiscal: [fiscal], financial: false });
    expect(result.sales).toBe(2); expect(result).not.toHaveProperty("amounts");
  });
  it("las notas pueden dejar un neto negativo sin crear ventas ficticias", () => {
    expect(summarizeSalesAggregates({ fiscal: [row("nota_credito", "20")], financial: true })).toMatchObject({ sales: 0, amounts: [{ currency: "HNL", amount: "-20.00" }] });
  });
  it("un conjunto vacío autorizado sí devuelve cero real", () => {
    expect(summarizeSalesAggregates({ financial: true }).amounts).toEqual([{ currency: "HNL", amount: "0.00" }]);
  });
  it("el administrador no pierde ninguna lectura configurada", () => {
    expect(Object.values(summaryScope(ALL_PERMISSIONS)).every(Boolean)).toBe(true);
  });
});

describe("precisión y presentación monetaria", () => {
  it("mantiene centavos incluso por encima del entero seguro de Number", () => {
    expect(centsMoney(moneyCents("9007199254740993.01") + moneyCents("0.10"))).toBe("9007199254740993.11");
    expect(formatSummaryMoney("9007199254740993.01")).toBe("L 9,007,199,254,740,993.01");
  });
  it("nulos de SUM y decimales ordinarios se normalizan sin NaN", () => {
    expect(centsMoney(moneyCents(null))).toBe("0.00");
    expect(centsMoney(moneyCents(0.1))).toBe("0.10");
    expect(formatSummaryMoney("-2.05", "USD")).toBe("−US$ 2.05");
  });
  it.each(["NaN", "Infinity", "texto", "1.001", "1e2"])("no convierte un importe inválido %s en cero", value => {
    expect(() => moneyCents(value)).toThrow();
  });
});
