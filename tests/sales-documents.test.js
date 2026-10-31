import { describe, expect, it } from "vitest";
import { salesDocuments, salesSummary, fiscalTypeLabel } from "../lib/sales-documents";

const commercial = { id: "historico", tipo: "venta", fecha: "2026-10-01", monto: 123.45, estado: "completada", items: [{ precio: 41.15, cantidad: 3 }] };
const quote = { id: "cotizacion", tipo: "cotizacion", fecha: "2026-10-02", estado: "pendiente", monto: 50 };
const fiscal = { id: "fiscal", tipo: "factura", fecha: "2026-10-03", estado: "emitido", correlativo: "001-001-01-000000001", cliente: { nombre: "Cliente eventual", rtn: "" }, total: "115", items: [{ descripcion: "Servicio", precio: "100", cantidad: "1" }] };

describe("listado único de ventas y cotizaciones", () => {
  it("combina fuentes por fecha sin convertir ni modificar históricos", () => {
    const before = JSON.stringify(commercial);
    const rows = salesDocuments([commercial, quote], [fiscal]);
    expect(rows.map(row => row.id)).toEqual(["fiscal", "cotizacion", "historico"]);
    expect(rows[0]).toMatchObject({ tipo: "venta", numero: fiscal.correlativo, fiscal, monto: 115, estado: "completada", cliente: "Cliente eventual" });
    expect(rows[0].items[0].nombre).toBe("Servicio");
    expect(rows[2].monto).toBe(123.45);
    expect(rows[2].items).toEqual(commercial.items);
    expect(JSON.stringify(commercial)).toBe(before);
  });
  it("no reutiliza ids comerciales como números fiscales ni inventa RTN", () => {
    const rows = salesDocuments([{ ...commercial, id: "fiscal" }], [{ ...fiscal, correlativo: null }]);
    expect(new Set(rows.map(row => row.sourceKey)).size).toBe(2);
    expect(rows.find(row => row.fiscal).clienteObj.rtn).toBe("");
    expect(rows.find(row => row.fiscal).numero).toBe("fiscal");
  });
  it("incluye ventas fiscales en el resumen de la misma sección", () => {
    expect(salesSummary(salesDocuments([commercial, quote], [fiscal]))).toEqual({ total: 1, pendientes: 1, ventas: 2, totalMonto: 288.45 });
  });
  it("conserva anulados consultables pero no los suma como venta vigente", () => {
    const rows = salesDocuments([quote], [{ ...fiscal, estado: "anulado", motivoAnulacion: "Error de prueba" }]);
    expect(rows[0]).toMatchObject({ estado: "cancelada", notas: "Error de prueba" });
    expect(salesSummary(rows)).toEqual({ total: 1, pendientes: 1, ventas: 0, totalMonto: 50 });
  });
  it("un vínculo fiscal histórico no duplica el importe ni el contador de ventas", () => {
    const rows = salesDocuments([commercial], [{ ...fiscal, ordenId: commercial.id }]);
    expect(rows).toHaveLength(2);
    expect(salesSummary(rows)).toMatchObject({ ventas: 1, totalMonto: 115 });
  });
  it("notas de crédito/débito conservan su identidad y signo sin contarse como otra factura", () => {
    const credit = { ...fiscal, id: "nc", tipo: "nota_credito", total: "20" };
    const debit = { ...fiscal, id: "nd", tipo: "nota_debito", total: "5" };
    const rows = salesDocuments([], [fiscal, credit, debit]);
    expect(salesSummary(rows)).toMatchObject({ ventas: 1, totalMonto: 100 });
    expect(fiscalTypeLabel(credit)).toBe("Nota de crédito");
    expect(fiscalTypeLabel(debit)).toBe("Nota de débito");
  });
});
