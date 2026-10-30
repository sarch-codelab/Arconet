import { describe, expect, it } from "vitest";
import {
  renderPurchaseDocument,
  renderFiscalDocument,
  renderOrderDocument,
} from "../lib/print-document";
import { order, documento, settings } from "./fixtures/print-documents";
const purchase = {
  id: "oc-qa",
  numero: "OC-2026-001",
  tipo: "compra",
  estado: "enviada",
  fecha: "2026-10-30",
  fechaVencimiento: "2026-11-29",
  terminos: "credito",
  diasCredito: 30,
  proveedor: {
    nombre: "Proveedor de prueba",
    rtn: "ID-GUARDADA",
    email: "proveedor@example.invalid",
    direccion: "Dirección guardada",
  },
  requeridoA: "Contacto compras",
  facturaProveedor: "FACT-EXTERNA-22",
  envio: "Guía de prueba",
  subtotal: 11304.34,
  impuesto: 1695.65,
  total: 12999.99,
  items: [
    {
      nombre: "Fibra",
      cantidad: 2,
      costoUnitario: 5652.17,
      impuestoPorcentaje: 15,
      producto: { sku: "F-6", unidad: "Pieza" },
    },
  ],
};
describe("formulario impreso de hoja completa", () => {
  it.each([
    "carta",
    "media-carta",
    "media-hoja",
    "ticket-80",
    "ticket-58",
    "auto",
  ])("proveedor mantiene datos y cálculos en %s", (paper) => {
    const html = renderPurchaseDocument({ order: purchase, settings, paper });
    for (const text of [
      "Orden de compra",
      "Requerido a",
      "Proveedor de prueba",
      "ID-GUARDADA",
      "FACT-EXTERNA-22",
      "OC-2026-001",
      "Guía de prueba",
      "Crédito 30 días",
      "L 12,999.99",
      "L 1,695.65",
      "DOCE MIL NOVECIENTOS NOVENTA Y NUEVE CON 99/100",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("window.open");
    expect(html).not.toContain("localStorage");
  });
  it("la cotización a proveedor no se presenta como factura ni recepción", () => {
    const html = renderPurchaseDocument({
      order: { ...purchase, tipo: "cotizacion" },
      settings,
    });
    expect(html).toContain("Cotización a proveedor");
    expect(html).toContain("ni crea existencias o pagos");
    expect(html).toContain("TOTAL ESTIMADO");
  });
  it("factura y cotización usan cabecera, logo central y cuadrícula compartida", () => {
    for (const html of [
      renderOrderDocument({ order, settings }),
      renderFiscalDocument({ documento, settings }),
    ]) {
      expect(html).toContain('class="logo-area"');
      expect(html).toContain('class="items form-grid"');
      expect(html).toContain("Código producto");
      expect(html).toContain("Presentado a");
      expect(html).toContain("Firma / recibido conforme");
      expect(html).toContain('class="amount-words"');
      expect(html).toContain('data-short="true"');
      expect(html).toContain("grayscale(1)");
    }
  });
  it("textos de proveedor y referencias no ejecutan HTML", () => {
    const attack = "<script>alert(1)</script>";
    const html = renderPurchaseDocument({
      order: {
        ...purchase,
        proveedor: { nombre: attack },
        requeridoA: attack,
        envio: attack,
        notas: attack,
      },
      settings,
    });
    expect(html).not.toContain(attack);
    expect(html).toContain("&lt;script&gt;");
  });
  it("no asigna el CAI o RTN de la imagen de referencia", () => {
    const html = renderFiscalDocument({
      documento: { ...documento, cai: null, correlativo: null },
      settings,
    });
    expect(html).toContain("SIN VALIDEZ FISCAL");
    expect(html).not.toContain("Arcolab");
  });
});
