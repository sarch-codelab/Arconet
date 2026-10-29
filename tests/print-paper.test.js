import { describe, expect, it } from "vitest";
import { PRINT_PAPERS, MAX_RECEIPT_HEIGHT, isPrintPaper, normalizePaper, printPageRule } from "../lib/print-paper";
import { renderFiscalDocument, renderOrderDocument } from "../lib/print-document";
import { documento, order, settings } from "./fixtures/print-documents";

describe("formatos de impresoras de recibos y hojas", () => {
  it("automático deja el tamaño al driver y adapta la distribución de rollos", () => {
    const css = printPageRule("auto");
    expect(css).toContain("size:auto");
    expect(css).toContain("@media print and (max-width:100mm)");
    expect(css).toContain("margin:5mm");
    const html = renderFiscalDocument({ documento, settings });
    expect(html).toContain('data-paper="auto"');
    expect(html).toContain('body[data-paper="auto"] .items tr{display:grid');
  });
  it.each(["ticket-80", "ticket-58"])("%s genera un rollo de largo variable sin contador de hojas", paper => {
    expect(printPageRule(paper, 245.2)).toContain(`size:${PRINT_PAPERS[paper].width}mm 246mm`);
    expect(printPageRule(paper)).toContain("content:none");
    expect(printPageRule(paper)).not.toContain("counter(page)");
    const html = renderFiscalDocument({ documento, settings, paper });
    expect(html).toContain('data-layout="receipt"');
    expect(html).toContain("measure.getBoundingClientRect().height");
    expect(html).toContain("window.addEventListener('beforeprint',updatePaperRule)");
    expect(html).toContain('data-label="Cantidad"');
    expect(html).toContain('data-label="Precio unitario"');
    expect(html).toContain('data-label="Descuento"');
    expect(html).toContain('data-label="ISV"');
    expect(html).toContain('data-label="Subtotal neto"');
  });
  it("acota el largo sin insertar valores arbitrarios en CSS", () => {
    expect(printPageRule("ticket-58", 1)).toContain("58mm 40mm");
    expect(printPageRule("ticket-80", 999999)).toContain(`80mm ${MAX_RECEIPT_HEIGHT}mm`);
    for (const height of [null, undefined, NaN, Infinity, -4, "</style><script>"]) {
      expect(printPageRule("ticket-80", height)).toContain("80mm 200mm");
    }
  });
  it.each(["__proto__", "constructor", ["ticket-80"], {}, null])( "no acepta formatos por coerción ni claves heredadas: %s", value => {
    expect(isPrintPaper(value)).toBe(false);
    expect(normalizePaper(value)).toBe("auto");
  });
  it("mantiene ambas orientaciones de media hoja sin cambiar enlaces anteriores", () => {
    expect(printPageRule("media-carta")).toContain("139.7mm 215.9mm");
    expect(printPageRule("media-hoja")).toContain("215.9mm 139.7mm");
    expect(printPageRule("carta")).toContain("215.9mm 279.4mm");
  });
  it("los tickets conservan pagos, saldo y los campos que no caben en una tabla", () => {
    const sale = { ...order, tipo: "venta", pagos: [{ monto: 50, estado: "confirmado", metodo: "efectivo", fecha: order.fecha, referencia: "PAGO-TICKET" }] };
    const html = renderOrderDocument({ order: sale, settings, paper: "ticket-58" });
    for (const text of ["PAGO-TICKET", "L 50.00", "Saldo pendiente", "L 140.00", order.cliente.rtn, order.notas, "CAM-001"]) expect(html).toContain(text);
    expect(html).not.toContain("overflow:hidden");
  });
  it("el selector solo notifica el formato, no envía documentos ni sesiones", () => {
    const html = renderOrderDocument({ order, settings });
    expect(html).toContain("{type:'arconet:print-paper',paper:this.value},window.location.origin");
    expect(html).not.toContain("localPreviewToken");
    expect(html).not.toContain("localStorage");
    expect(html).not.toContain("window.open");
  });
});
