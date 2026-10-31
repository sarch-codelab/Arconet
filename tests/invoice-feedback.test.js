import { describe, expect, it } from "vitest";
import { invoiceIssues, createFiscalDraftMemory } from "../lib/invoice-feedback";
const line = { kind: "concepto", descripcion: "Servicio QA", cantidad: "1", precio: "100", descuento: "", impuestoPorcentaje: "15" };
const ready = { clienteId: "qa", lineas: [line], config: { canIssue: true, state: "ready" } };
describe("emisión con explicación visible, no disabled silencioso", () => {
  it("explica cliente y detalle faltantes antes de enviar", () => {
    const issues = invoiceIssues({});
    expect(issues.some(i => i.includes("Selecciona un cliente"))).toBe(true);
    expect(issues.some(i => i.includes("Añade al menos"))).toBe(true);
  });
  it("los datos completos permiten enviar pero no prometen existencias", () => expect(invoiceIssues(ready)).toEqual([]));
  it("registro pendiente de CAI no se confunde con autorización lista", () => {
    expect(invoiceIssues({ ...ready, config: { state: "unconfigured", canIssue: true, pending: true } })).toEqual([]);
  });
  it("la autorización incompleta/vencida impide una nueva emisión con su motivo", () => {
    expect(invoiceIssues({ ...ready, config: { canIssue: false, issues: ["Rango vencido"] } })).toEqual(["Rango vencido"]);
  });
  it("un reintento puede recuperar la referencia previa aunque el rango se agotara", () => {
    expect(invoiceIssues({ ...ready, recovering: true, config: { canIssue: false, issues: ["Agotado"] } })).toEqual([]);
  });
  it("sin permiso no habilita la recuperación ni el envío", () => expect(invoiceIssues({ ...ready, recovering: true, canEmit: false })).toEqual(["Tu cuenta no tiene permiso para emitir ventas fiscales."]));
  it.each([{ loading: true }, { loadError: "fallo" }, { clientBusy: true }, { clientCreating: true }])("explica estado no disponible %j", fields => {
    expect(invoiceIssues({ ...ready, ...fields }).length).toBeGreaterThan(0);
  });
  it("un SKU debe elegirse; no basta una descripción libre en una línea de producto", () => {
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, kind: "producto" }] }).some(i => i.includes("selecciona un producto"))).toBe(true);
  });
  it.each(["", "abc", "0", "-1", "1.0001"])("explica cantidad inválida %s", cantidad => {
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, cantidad }] }).some(i => i.includes("cantidad y precio"))).toBe(true);
  });
  it.each(["", "abc", "-1", "0.001"])("explica precio inválido %s", precio => {
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, precio }] }).length).toBeGreaterThan(0);
  });
  it.each(["-1", "101", "0.001", "abc"])("explica descuento inválido %s", descuento => {
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, descuento }] }).some(i => i.includes("descuento"))).toBe(true);
  });
  it("cero explícito, fracciones de concepto e ISV exento son válidos", () => {
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, cantidad: "0.5", precio: "0", impuestoPorcentaje: "0" }] })).toEqual([]);
  });
  it("limita líneas y total sin enviar cifras inválidas", () => {
    expect(invoiceIssues({ ...ready, lineas: Array(101).fill(line) }).join(" ")).toContain("100 líneas");
    expect(invoiceIssues({ ...ready, lineas: [{ ...line, cantidad: 999999999, precio: 9999999999 }] }).join(" ")).toContain("importe máximo");
  });
  it("el borrador se conserva sólo en la instancia autenticada, no globalmente", () => {
    const a = createFiscalDraftMemory(), b = createFiscalDraftMemory();
    a.write({ lineas: [line], clienteId: "qa", emissionKey: "referencia-no-credencial" });
    expect(a.read().lineas).toHaveLength(1); expect(b.read()).toBe(null);
    a.write(null); expect(a.read()).toBe(null);
  });
});
