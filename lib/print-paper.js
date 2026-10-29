// Compartido por el HTML autónomo y el visor; no incluye datos del documento.
export const PRINT_PAPERS = Object.freeze({
  auto: { label: "Automático · papel de la impresora", kind: "auto", width: 215.9, height: 279.4, margin: 12 },
  carta: { label: "Hoja completa · Carta (21.6 × 27.9 cm)", kind: "sheet", width: 215.9, height: 279.4, margin: 12 },
  "media-hoja": { label: "Media hoja · 21.6 × 14 cm", kind: "sheet", width: 215.9, height: 139.7, margin: 6 },
  "media-carta": { label: "Media carta vertical · 14 × 21.6 cm", kind: "sheet", width: 139.7, height: 215.9, margin: 8 },
  "ticket-80": { label: "Recibo / ticket · rollo de 80 mm", kind: "receipt", width: 80, height: 200, margin: 4 },
  "ticket-58": { label: "Recibo / ticket · rollo de 58 mm", kind: "receipt", width: 58, height: 200, margin: 5 },
});

export const MIN_RECEIPT_HEIGHT = 40;
export const MAX_RECEIPT_HEIGHT = 3000;

export function isPrintPaper(value) {
  return typeof value === "string" && Object.hasOwn(PRINT_PAPERS, value);
}

export function normalizePaper(value) {
  return isPrintPaper(value) ? value : "auto";
}

export function printPageRule(value, receiptHeight) {
  const paper = normalizePaper(value);
  const format = PRINT_PAPERS[paper];
  if (format.kind === "auto") {
    // El navegador/driver conoce el papel, no la página web. Las media
    // queries de impresión se evalúan contra ese papel, no el celular.
    return `@page{size:auto;margin:12mm}@page{@bottom-right{content:"Página " counter(page) " de " counter(pages);font:7pt Arial;color:#000}}@media print and (max-width:100mm){@page{margin:5mm;@bottom-right{content:none}}}`;
  }
  let height = format.height;
  if (format.kind === "receipt") {
    const measured = Number(receiptHeight);
    height = Number.isFinite(measured) && measured > 0 ? Math.ceil(measured) : height;
    height = Math.max(MIN_RECEIPT_HEIGHT, Math.min(MAX_RECEIPT_HEIGHT, height));
  }
  const footer = format.kind === "receipt"
    ? "@page{@bottom-right{content:none}}"
    : '@page{@bottom-right{content:"Página " counter(page) " de " counter(pages);font:7pt Arial;color:#000}}';
  return `@page{size:${format.width}mm ${height}mm;margin:${format.margin}mm}${footer}`;
}
