// Una sola plantilla para facturas fiscales, ventas y cotizaciones de admin
// y del portal. HTML autónomo: también funciona dentro de una URL blob.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { moneyWords } from "./money-words";
import { commercialTotal } from "./ventas-form";
import { paymentTerms, purchaseDate } from "./compras-form";
import { CONTACT_EMAIL, CONTACT_PHONE } from "./contact.js";

import { PRINT_PAPERS, normalizePaper, printPageRule, MIN_RECEIPT_HEIGHT, MAX_RECEIPT_HEIGHT } from "./print-paper.js";
export { PRINT_PAPERS, normalizePaper } from "./print-paper.js";

export const DOCUMENT_SETTINGS_KEYS = [
  "companyName", "email", "phone", "currency", "fiscal.nit", "fiscal.nombre", "fiscal.direccion",
  "fiscal.cai", "fiscal.serie", "fiscal.rangoInicio", "fiscal.rangoFin", "fiscal.fechaLimite",
];

// No seleccionar costos, márgenes ni otros datos internos del producto.
export const ORDER_DOCUMENT_INCLUDE = {
  cliente: true,
  items: { include: { producto: { select: { sku: true, unidad: true } } } },
  pagos: { orderBy: { fecha: "asc" } },
};

export const DOCUMENT_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function money(value, currency = "L") {
  return `${esc(currency)} ${Number(value ?? 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function printOptions(request) {
  const params = new URL(request.url).searchParams;
  return { paper: normalizePaper(params.get("formato")), autoPrint: params.get("auto") === "1" };
}

export function documentDate(value) {
  if (!value) return "No registrada";
  // Las fechas de calendario (fecha límite) no deben retroceder un día por UTC.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No registrada" : date.toLocaleDateString("es-HN", { timeZone: "America/Tegucigalpa" });
}

let embeddedLogo;
export function logoDataUrl() {
  if (embeddedLogo) return embeddedLogo;
  for (const filename of ["arconet-impresion.png", "arconet.png"]) {
    try {
      embeddedLogo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", filename)).toString("base64")}`;
      return embeddedLogo;
    } catch { /* El original es el respaldo de la versión monocromática. */ }
  }
  return null;
}

// La misma información se reorganiza en tickets; no se achica una tabla de
// seis columnas hasta volverla ilegible ni se ocultan datos fiscales.
function receiptStyles(scope) {
  return [
    ["", "font-size:9pt;line-height:1.25"],
    [".doc-header", "display:flex;flex-direction:column;border-bottom:1px dashed #000;padding-bottom:2mm;break-inside:auto"],
    [".logo-area", "order:-1"],
    [".doc-header>.emisor,.doc-header>.logo-area,.doc-header>.doc-info", "display:block;width:100%;padding:0"],
    [".meta>.panel", "display:block;width:100%"],
    [".extra-cell", "display:none!important"],
    [".items.form-grid", "height:auto"],
    [".items tr.grid-filler", "display:none"],
    [".items td.description", "grid-column:1/-1;font-weight:bold"],
    [".items .item-code", "display:block"],
    [".facts", "font-size:.9em"],
    [".brand-logo", "width:40mm;margin:0 auto 2mm"],
    [".emisor", "text-align:center"],
    [".doc-info", "text-align:center;margin-top:2mm"],
    [".doc-info h1", "font-size:1.12em"],
    [".meta", "display:block;margin:2mm 0"],
    [".panel", "border:0;border-bottom:1px dashed #000;padding:2mm 0;break-inside:auto"],
    [".notice", "padding:1mm;margin:2mm 0"],
    [".items", "display:block;font-size:inherit;margin:2mm 0"],
    [".items colgroup", "display:none"],
    [".items thead", "display:none"],
    [".items tbody", "display:block"],
    [".items tr", "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1mm 2mm;border-bottom:1px dashed #000;padding:2mm 0"],
    [".items td", "display:block;min-width:0;padding:0;border:0"],
    [".items td:first-child", "grid-column:1/-1;font-weight:bold"],
    [".items td.num", "text-align:left"],
    [".items td.num::before", 'content:attr(data-label) ": ";display:block;font-size:.85em;font-weight:normal'],
    [".items td:last-child", "grid-column:1/-1;text-align:right;font-weight:bold"],
    [".items td:last-child::before", "display:inline"],
    [".item-code", "font-weight:normal;margin-top:.5mm"],
    [".closing-table,.closing-table tbody", "display:block;width:100%;margin:2mm 0"],
    [".closing-table tr", "display:flex;flex-direction:column-reverse"],
    [".closing-table .closing-memo,.closing-table .closing-totals", "display:block;width:100%;padding:0"],
    [".totals", "width:100%;margin:2mm 0;table-layout:fixed"],
    [".totals th", "width:55%"],
    [".totals th,.totals td", "padding:1mm 0"],
    [".notes,.authorization,.signature", "width:100%"],
    [".authorization", "padding:1mm;font-size:.9em;break-inside:auto"],
    [".footer", "font-size:.85em;border-top:1px dashed #000"],
    [".document-end", "break-inside:auto;page-break-inside:auto"],
  ].map(([selector, declarations]) => {
    // Dar el mismo scope a cada selector separado por coma.
    const selectors = selector.split(",").map(part => scope + (part ? " " + part : "")).join(",");
    return `${selectors}{${declarations}}`;
  }).join("");
}

const PAPER_CSS = Object.entries(PRINT_PAPERS).map(([key, paper]) =>
  `body[data-paper="${key}"]{--paper-width:${paper.width}mm;--paper-height:${paper.kind === "receipt" ? 0 : paper.height}mm;--margin:${paper.margin}mm}`,
).join("");

const CSS = `
*{box-sizing:border-box}html{color-scheme:light;-webkit-text-size-adjust:100%;text-size-adjust:100%}body{--paper-width:215.9mm;--paper-height:279.4mm;--margin:12mm;margin:0;background:#fff;color:#000;font:9pt/1.2 Arial,Helvetica,sans-serif}
body[data-paper="media-carta"],
body[data-paper="media-hoja"]{font-size:8.5pt}
.toolbar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;padding:16px;border-bottom:1px solid #000;font:14px/1.4 Arial,Helvetica,sans-serif}
.toolbar label{font-weight:bold}.toolbar button,.toolbar select{font:inherit;color:#000;background:#fff;border:1px solid #000;border-radius:4px;padding:9px;cursor:pointer}.toolbar button{font-weight:bold}.toolbar p{flex-basis:100%;margin:0;text-align:center;font-size:12px}
.sheet{width:var(--paper-width);min-height:var(--paper-height);margin:20px auto;padding:var(--margin);border:1px solid #000;background:#fff}
.doc-header{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:6mm;border-bottom:3px double #000;padding-bottom:3mm;break-inside:avoid}
.emisor,.doc-info{min-width:0;overflow-wrap:anywhere}.brand-logo{display:block;width:54mm;max-width:100%;height:auto;margin-bottom:2mm;filter:grayscale(1);print-color-adjust:exact;-webkit-print-color-adjust:exact}
.razon{font-size:1.12em;margin:0 0 2mm;font-weight:bold}.doc-info{text-align:right}.doc-info h1{font-size:1.35em;margin:0 0 2mm;line-height:1.2;text-transform:uppercase}.doc-number{font-size:1.1em;font-weight:bold}.line{margin:.5mm 0}.muted{font-size:.88em}.meta{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:3mm;margin:3mm 0}.panel{min-width:0;border:1px solid #000;padding:2.5mm;overflow-wrap:anywhere;break-inside:avoid}.panel h2,.notes h2{font-size:.88em;text-transform:uppercase;letter-spacing:.06em;margin:0 0 2mm}.panel p{margin:.5mm 0}
.notice,.void{border:1px dashed #000;padding:2mm;margin:3mm 0;font-size:.9em;overflow-wrap:anywhere}.void{border:3px double #000;font-weight:bold}.items{width:100%;border-collapse:collapse;table-layout:fixed;margin:3mm 0;font-size:.95em}.items th,.items td{padding:1.5mm 1.4mm;vertical-align:top;text-align:left;border-bottom:1px solid #000;overflow-wrap:anywhere}.items th{border-top:2px solid #000;border-bottom:2px solid #000;font-size:.9em;line-height:1.2}.items .num,.totals .num{text-align:right;font-variant-numeric:tabular-nums}.items thead{display:table-header-group}.items tr{break-inside:avoid;page-break-inside:avoid}.item-code{display:block;font-size:.85em;margin-top:1mm}.totals{width:65%;margin:3mm 0 3mm auto;border-collapse:collapse;break-inside:avoid}.totals th,.totals td{padding:1.1mm 1.5mm;border-bottom:1px solid #000;text-align:left;overflow-wrap:anywhere}.totals th{font-weight:normal}.totals .grand th,.totals .grand td{border-top:2px solid #000;border-bottom:3px double #000;font-size:1.12em;font-weight:bold}.notes{margin:3mm 0;white-space:pre-wrap;overflow-wrap:anywhere}.notes h2{white-space:normal;break-after:avoid;page-break-after:avoid}.authorization{margin:3mm 0;padding:2mm;border:1px solid #000;font-size:.88em;overflow-wrap:anywhere;break-inside:avoid}.authorization p{margin:.5mm 0}.footer{margin-top:3mm;border-top:3px double #000;padding-top:1.5mm;font-size:.8em;break-inside:avoid;overflow-wrap:anywhere}.hash{font-family:monospace;overflow-wrap:anywhere}.thanks{text-align:center;margin:1mm 0 0;font-weight:bold;letter-spacing:.08em}
body[data-paper="media-carta"] .brand-logo,
body[data-paper="media-hoja"] .brand-logo{width:40mm}body[data-paper="media-carta"] .doc-header,body[data-paper="media-hoja"] .doc-header{gap:3mm}body[data-paper="media-carta"] .panel,body[data-paper="media-hoja"] .panel{padding:2mm}body[data-paper="media-carta"] .items,body[data-paper="media-hoja"] .items{font-size:.9em}body[data-paper="media-carta"] .items th,body[data-paper="media-hoja"] .items th,body[data-paper="media-carta"] .items td,body[data-paper="media-hoja"] .items td{padding:1.2mm .8mm}
body[data-paper="media-carta"],
body[data-paper="media-hoja"]{line-height:1.2}body[data-paper="media-carta"] .line,body[data-paper="media-hoja"] .line,body[data-paper="media-carta"] .panel p,body[data-paper="media-hoja"] .panel p,body[data-paper="media-carta"] .authorization p,body[data-paper="media-hoja"] .authorization p{margin:.3mm 0}body[data-paper="media-carta"] .brand-logo,body[data-paper="media-hoja"] .brand-logo{margin-bottom:1.5mm}body[data-paper="media-carta"] .doc-header,body[data-paper="media-hoja"] .doc-header{padding-bottom:2mm}body[data-paper="media-carta"] .panel h2,body[data-paper="media-hoja"] .panel h2,body[data-paper="media-carta"] .notes h2,body[data-paper="media-hoja"] .notes h2{margin-bottom:1.2mm}body[data-paper="media-carta"] .totals th,body[data-paper="media-hoja"] .totals th,body[data-paper="media-carta"] .totals td,body[data-paper="media-hoja"] .totals td{padding:.8mm 1mm}body[data-paper="media-carta"] .totals,body[data-paper="media-hoja"] .totals{width:70%}
body[data-paper="media-hoja"] .notice,body[data-paper="media-hoja"] .meta,body[data-paper="media-hoja"] .items,body[data-paper="media-hoja"] .notes,body[data-paper="media-hoja"] .authorization{margin-top:1.5mm;margin-bottom:1.5mm}
body[data-paper="media-hoja"] .panel{padding:1.5mm}body[data-paper="media-hoja"] .brand-logo{width:35mm;margin-bottom:1mm}body[data-paper="media-hoja"] .doc-header{padding-bottom:1.5mm}
body[data-paper="media-hoja"] .items th,body[data-paper="media-hoja"] .items td{padding:.8mm}body[data-paper="media-hoja"] .item-code{margin-top:.5mm}
body[data-paper="media-hoja"] .totals{width:48%;margin:1.5mm 0 1.5mm 4mm}body[data-paper="media-hoja"] .totals th,body[data-paper="media-hoja"] .totals td{padding:.5mm 1mm}
body[data-paper="media-hoja"] .notes,body[data-paper="media-hoja"] .authorization{width:48%}body[data-paper="media-hoja"] .footer{clear:both;margin-top:1.5mm}

/* Formulario de hoja completa inspirado en la referencia del usuario. */
.doc-header{grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr) minmax(0,1fr);gap:4mm;border-bottom:0;padding-bottom:0}
.logo-area{display:flex;align-items:center;justify-content:center;min-width:0}.logo-area .brand-logo{width:48mm;max-width:100%;margin:0}
.doc-info{border:1px solid #000;text-align:left;padding:2mm;align-self:start}.doc-info h1{text-align:center;border-bottom:1px solid #000;padding-bottom:1.5mm}
.meta{grid-template-columns:1fr 1fr}.panel{border-radius:2mm}.facts{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.86em;margin:2mm 0}.facts td{border:1px solid #000;padding:1mm 1.5mm;vertical-align:top;overflow-wrap:anywhere}.facts strong{display:block;margin-bottom:.6mm}
.items.form-grid{border:1px solid #000;margin-top:0}.form-grid td,.form-grid th{border-left:1px solid #000;border-right:1px solid #000}.form-grid .item-code{display:none}.form-grid .extra-cell{padding-left:.6mm;padding-right:.6mm}.form-grid .tax-label{display:block;font-size:.85em;margin-top:1mm}.grid-filler{display:none}
body[data-paper="auto"] .form-grid[data-short="true"],
body[data-paper="carta"] .form-grid[data-short="true"]{height:auto}
body[data-paper="auto"] .form-grid[data-short="true"] tbody tr:not(.grid-filler),
body[data-paper="carta"] .form-grid[data-short="true"] tbody tr:not(.grid-filler){height:7mm}
body[data-paper="auto"] .form-grid[data-short="true"] .grid-filler,
body[data-paper="carta"] .form-grid[data-short="true"] .grid-filler{display:none}
body[data-paper="auto"] .form-grid .grid-filler td,
body[data-paper="carta"] .form-grid .grid-filler td{padding:0;border-bottom:0}
.amount-words{font-weight:bold;text-align:center;font-size:.9em;overflow-wrap:anywhere;margin:2mm 0}.signature{display:flex;justify-content:space-between;gap:6mm;margin:5mm 0 2mm;font-size:.85em;break-inside:avoid}.signature span{flex:1;border-bottom:1px solid #000;padding-top:4mm}
@media screen and (max-width:600px){.doc-header{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.logo-area{grid-column:1/-1;grid-row:1}.logo-area .brand-logo{width:42mm}.form-grid{font-size:7.5pt}.facts{font-size:8pt}}

.totals{width:44%;margin:3mm 0 3mm 4mm}.authorization,.notes,.signature{width:52%}.amount-words,.footer{clear:both}
body[data-paper="media-carta"] .totals{width:100%;margin:2mm 0}body[data-paper="media-carta"] .authorization,body[data-paper="media-carta"] .notes,body[data-paper="media-carta"] .signature{width:100%}
body[data-paper="media-carta"]{font-size:8pt;line-height:1.1}body[data-paper="media-hoja"]{font-size:7.5pt;line-height:1.1}
body[data-paper="media-carta"] .totals{width:48%;margin:1mm 0 1mm 2mm}body[data-paper="media-carta"] .authorization,body[data-paper="media-carta"] .notes,body[data-paper="media-carta"] .signature{width:49%}
body[data-paper="media-carta"] .facts td,
body[data-paper="media-hoja"] .facts td{padding:.4mm .7mm}body[data-paper="media-carta"] .facts strong,body[data-paper="media-hoja"] .facts strong{margin-bottom:.2mm}body[data-paper="media-carta"] .signature,body[data-paper="media-hoja"] .signature{margin-top:2mm;margin-bottom:1mm}body[data-paper="media-carta"] .signature span,body[data-paper="media-hoja"] .signature span{padding-top:2mm}
/* El cierre es flujo paginable, no un float ni un bloque indivisible.
   Safari/AirPrint no debe trasladarlo entero dejando libre la primera hoja. */
.closing-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:2mm 0;break-inside:auto;page-break-inside:auto}
.closing-table>tbody{break-inside:auto;page-break-inside:auto}
.closing-table>tbody>tr{break-inside:auto;page-break-inside:auto}
.closing-table>tbody>tr>td{vertical-align:top;padding:0;border:0;min-width:0}
.closing-table .closing-memo{width:56%;padding-right:4mm}
.closing-table .closing-totals{width:44%}
.closing-totals .totals{width:100%!important;margin:0!important;break-inside:avoid;page-break-inside:avoid}
.closing-memo .notes,.closing-memo .authorization,.closing-memo .signature{width:100%!important}
.closing-memo .notes:first-child,.closing-memo .authorization:first-child{margin-top:0}
${PAPER_CSS}
${receiptStyles('body[data-layout="receipt"]')}
body[data-layout="receipt"] .sheet{min-height:0;max-width:100%}
@media screen and (max-width:600px){body:not([data-layout="receipt"]) .sheet{width:100%;min-height:0;margin:0;border:0;padding:16px}.toolbar{padding:12px}.toolbar select{max-width:100%}}
.document-end{display:block;break-inside:auto;page-break-inside:auto}
body[data-layout="receipt"] .document-end{break-inside:auto;page-break-inside:auto}
/* El relleno decorativo nunca debe ocupar una página en AirPrint/WebKit.
   !important también neutraliza alturas de una copia HTML guardada. */
@media print{.sheet .items.form-grid{height:auto!important;min-height:0!important}.sheet .grid-filler{display:none!important;height:0!important}.document-end{break-inside:auto;page-break-inside:auto}body[data-layout="receipt"] .document-end{break-inside:auto;page-break-inside:auto}}
@media print{html,body{-webkit-text-size-adjust:100%;text-size-adjust:100%;margin:0;background:#fff;color:#000}.toolbar{display:none!important}.sheet{display:block;width:auto;height:auto!important;min-height:0!important;max-height:none;margin:0;padding:0;border:0}.doc-header,.meta{margin-top:0}.doc-header{display:table;width:100%;table-layout:fixed}.doc-header>.emisor,.doc-header>.logo-area,.doc-header>.doc-info{display:table-cell;vertical-align:top}.doc-header>.emisor{width:36%;padding-right:3mm}.doc-header>.logo-area{width:30%;vertical-align:middle;padding:0 3mm}.doc-header>.doc-info{width:34%}.meta{display:table;width:100%;table-layout:fixed}.meta>.panel{display:table-cell;width:50%;vertical-align:top}.meta>.panel+.panel{border-left:0}a{color:#000;text-decoration:none}}
`;

export function docShell({ title, body, paper = "auto", autoPrint = false }) {
  paper = normalizePaper(paper);
  // Todo el documento funciona sin servidor al guardarlo como HTML. Solo se
  // comunica la elección de papel al visor, nunca el documento ni la sesión.
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title><style>${CSS}</style><style id="paper-rule">${printPageRule(paper)}</style></head><body data-paper="${paper}" data-layout="${PRINT_PAPERS[paper].kind}">
<div class="toolbar" role="region" aria-label="Opciones de impresión"><label for="paper-size">Tamaño de papel</label><select id="paper-size">${Object.entries(PRINT_PAPERS).map(([key, value]) => `<option value="${key}"${key === paper ? " selected" : ""}>${value.label}</option>`).join("")}</select><button type="button" id="print-document">Imprimir / Guardar como PDF</button><p id="paper-help" role="status">Selecciona la impresora y su papel al imprimir. Blanco y negro · Escala 100% · Sin encabezados ni pies del navegador.</p></div>
<main class="sheet">${body}</main><script>
(function(){
  var papers=${JSON.stringify(PRINT_PAPERS)};
  var rules=${JSON.stringify(Object.fromEntries(Object.keys(PRINT_PAPERS).map(key => [key, printPageRule(key)])))};
  var selector=document.getElementById('paper-size');
  function updatePaperRule(){
    var key=selector.value;
    if(!Object.prototype.hasOwnProperty.call(papers,key))return;
    var paper=papers[key];
    var rule=rules[key];
    // No asignar altura a la tabla: el papel automático puede ser A4 o Carta
    // y WebKit puede imprimir sin disparar beforeprint. El cierre fluye con
    // el detalle; sólo se mide el largo cuando el usuario elige un ticket.
    if(paper.kind==='receipt'){
      // Medir al ancho imprimible real, sin el marco/padding de la pantalla.
      // El margen extra evita una segunda página por redondeo del navegador.
      var measure=document.querySelector('.sheet').cloneNode(true);
      measure.style.cssText='position:absolute;left:-10000px;top:0;visibility:hidden;display:flow-root;max-width:none;min-height:0;height:auto;margin:0;border:0;padding:0;width:'+(paper.width-2*paper.margin)+'mm';
      measure.setAttribute('aria-hidden','true');
      document.body.appendChild(measure);
      var height=Math.ceil(measure.getBoundingClientRect().height*25.4/96+2*paper.margin+2);
      measure.remove();
      height=Math.max(${MIN_RECEIPT_HEIGHT},Math.min(${MAX_RECEIPT_HEIGHT},height));
      rule=rule.replace('size:'+paper.width+'mm '+paper.height+'mm','size:'+paper.width+'mm '+height+'mm');
    }
    document.getElementById('paper-rule').textContent=rule;
  }
  selector.addEventListener('change',function(){
    if(!Object.prototype.hasOwnProperty.call(papers,this.value))return;
    document.body.dataset.paper=this.value;
    document.body.dataset.layout=papers[this.value].kind;
    document.getElementById('paper-help').textContent=(papers[this.value].kind==='receipt'?'Rollo de '+papers[this.value].width+' mm · Largo ajustado al recibo. ':this.value==='auto'?'Automático usa el papel de la impresora. Elige 58 u 80 mm para previsualizar un ticket aquí. ':'Usa este tamaño de papel en la impresora. ')+'Blanco y negro · Escala 100% · Sin encabezados ni pies del navegador.';
    updatePaperRule();
    // about:srcdoc tiene location.origin "null", pero conserva el origen del
    // padre. Nunca enviar datos del documento ni usar un destino comodín.
    if(window.parent!==window){try{window.parent.postMessage({type:'arconet:print-paper',paper:this.value},window.parent.location.origin);}catch{}}
  });
  async function preparePrint(){
    await Promise.all(Array.from(document.images,function(image){return image.decode().catch(function(){});}));
    if(document.fonts)await document.fonts.ready;
    updatePaperRule();
  }
  async function printDocument(){
    await preparePrint();
    window.print();
  }
  window.addEventListener('beforeprint',updatePaperRule);
  document.getElementById('print-document').addEventListener('click',printDocument);
  preparePrint();
  ${autoPrint ? "window.addEventListener('load',printDocument);" : ""}
})();
</script></body></html>`;
}

function companyData(settings) {
  return {
    name: settings["fiscal.nombre"] || settings.companyName || "Arconet",
    rtn: settings["fiscal.nit"] || "No registrado",
    address: settings["fiscal.direccion"] || "Dirección no registrada",
    phone: settings.phone || CONTACT_PHONE,
    email: settings.email || CONTACT_EMAIL,
  };
}

function header({ company, title, number, date, extra = "" }) {
  const logo = logoDataUrl();
  return `<header class="doc-header"><div class="emisor"><p class="razon">${esc(company.name)}</p><div class="line">${esc(company.address)}</div><div class="line">Tel.: ${esc(company.phone)}</div><div class="line">${esc(company.email)}</div><div class="line">RTN: ${esc(company.rtn)}</div></div><div class="logo-area">${logo ? `<img class="brand-logo" src="${logo}" alt="Logo Arconet" width="900" height="150">` : "<p class=\"razon\">ARCONET</p>"}</div><div class="doc-info"><h1>${esc(title)}</h1><div class="line">Número / referencia</div><div class="doc-number">${esc(number)}</div><div class="line">Fecha de emisión: ${esc(documentDate(date))}</div>${extra}</div></header>`;
}

function clientPanel(cliente = {}, label = "Presentado a · Datos del cliente") {
  return `<section class="panel"><h2>${esc(label)}</h2><p><strong>${esc(cliente.nombre || "No registrado")}</strong></p><p>RTN: ${esc(cliente.rtn || "No registrado")}</p>${cliente.contacto ? `<p>Contacto: ${esc(cliente.contacto)}</p>` : ""}<p>${esc(cliente.direccion || "Dirección no registrada")}${cliente.ciudad ? ` · ${esc(cliente.ciudad)}` : ""}</p><p>Tel.: ${esc(cliente.telefono || "No registrado")}</p><p>Correo: ${esc(cliente.correo || "No registrado")}</p></section>`;
}

function totals(rows) {
  return `<table class="totals" aria-label="Totales"><tbody>${rows.map(([label, value, grand]) => `<tr${grand ? ' class="grand"' : ""}><th scope="row">${esc(label)}</th><td class="num">${value}</td></tr>`).join("")}</tbody></table>`;
}

function notes(value, label = "Notas y condiciones") {
  return value ? `<section class="notes"><h2>${esc(label)}</h2>${esc(value)}</section>` : "";
}

function footer(hash) {
  return `<footer class="footer">${hash ? `<div class="hash">Huella SHA-256 del registro: ${esc(hash)}</div>` : ""}<div>Arconet · Conserve todas las páginas del documento.</div><p class="thanks">Gracias por su preferencia</p></footer>`;
}

function quantity(value) {
  return esc(Number(value ?? 0).toLocaleString("es-HN", { maximumFractionDigits: 3 }));
}

function productCode(item) {
  return item.producto?.sku ? `<span class="item-code">Código: ${esc(item.producto.sku)}${item.producto.unidad ? ` · ${esc(item.producto.unidad)}` : ""}</span>` : "";
}

function facts(entries) {
  return `<table class="facts" aria-label="Cabecera del documento"><tbody>${Array.from({ length: Math.ceil(entries.length / 4) }, (_, i) => `<tr>${entries.slice(i * 4, i * 4 + 4).map(([label, value]) => `<td><strong>${esc(label)}</strong>${esc(value || "No registrado")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function printUnit(value) {
  return ({ Unidad: "UND", Pieza: "PZA", Metro: "M", Caja: "CJA", Rollo: "ROL" })[value] || value || "—";
}

function lineGrid(items, currency, mode = "order") {
  const fiscal = mode === "fiscal", purchase = mode === "purchase";
  return `<table class="items form-grid" data-short="${items.length <= 8}" aria-label="${fiscal ? "Detalle fiscal" : "Detalle de productos"}"><colgroup><col style="width:4%"><col style="width:12%"><col style="width:27%"><col style="width:4%"><col style="width:7%"><col style="width:7%"><col style="width:14%"><col style="width:10%"><col style="width:15%"></colgroup><thead><tr><th class="extra-cell">Itm</th><th class="extra-cell">Código producto</th><th>Descripción producto</th><th class="extra-cell">Bod.</th><th class="num">Cant.</th><th class="extra-cell">Unid.</th><th class="num">${purchase ? "Costo neto" : "Precio unit."}</th><th class="num">Desc.</th><th class="num">${fiscal ? "Subtotal neto" : "Importe"}</th></tr></thead><tbody>${items.map((item, index) => `<tr><td class="extra-cell">${index + 1}</td><td class="extra-cell">${esc(item.producto?.sku || "—")}</td><td class="description">${esc(item.descripcion || item.nombre)}${productCode(item)}${fiscal || purchase ? `<span class="tax-label" data-label="ISV">ISV: ${quantity(item.impuestoPorcentaje || 0)}%</span>` : ""}</td><td class="extra-cell">—</td><td class="num" data-label="Cantidad">${quantity(item.cantidad)}</td><td class="extra-cell">${esc(printUnit(item.producto?.unidad))}</td><td class="num" data-label="${purchase ? "Costo unitario neto" : "Precio unitario"}">${money(purchase ? item.costoUnitario : item.precio, currency)}</td><td class="num" data-label="Descuento">${money(fiscal ? item.descuento : 0, currency)}</td><td class="num" data-label="${fiscal ? "Subtotal neto" : "Importe"}">${money(fiscal ? item.subtotal : Math.round((Number(item.cantidad) * Number(purchase ? item.costoUnitario : item.precio) + Number.EPSILON) * 100) / 100, currency)}</td></tr>`).join("")}</tbody></table>`;
}
function closingAmount(amount) {
  return `<p class="amount-words">${esc(moneyWords(amount))}</p>`;
}
function closingSummary(rows, memo = "") {
  return `<table class="closing-table" role="presentation"><tbody><tr><td class="closing-memo">${memo}<div class="signature"><span>Firma / recibido conforme</span><span>Fecha de recepción</span></div></td><td class="closing-totals">${totals(rows)}</td></tr></tbody></table>`;
}

export function renderOrderDocument({ order, settings = {}, ...options }) {
  // Las fechas elegidas en el formulario llegan como medianoche UTC. No
  // retroceder ese calendario; conservar los timestamps históricos con hora.
  const storedDate = order.fecha ? new Date(order.fecha) : null;
  const orderDate = storedDate && !Number.isNaN(storedDate.getTime()) && storedDate.toISOString().endsWith("T00:00:00.000Z")
    ? purchaseDate(order.fecha) : order.fecha;
  const company = companyData(settings);
  const currency = settings.currency || "L";
  const invoice = order.tipo === "venta";
  const title = invoice ? "Factura comercial" : "Cotización";
  const items = order.items || [];
  const subtotal = commercialTotal(items);
  const discount = Number(order.descuento || 0);

  const adjustment = Math.round((Number(order.monto) - subtotal + discount) * 100) / 100;
  const confirmed = (order.pagos || []).filter(pago => pago.estado === "confirmado");
  const paid = confirmed.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const totalRows = [
    ...(items.length ? [["Subtotal de productos", money(subtotal, currency)]] : []),
    ["Descuento", money(discount, currency)],
    ...(items.length && adjustment !== 0 ? [["Otros ajustes (sin desglose fiscal)", money(adjustment, currency)]] : []),
    // No inventar ISV a partir del monto ni descontarlo otra vez: el monto
    // guardado es el total comercial, que puede contener ajustes manuales.
    [invoice ? "TOTAL COMERCIAL" : "TOTAL COTIZADO", money(order.monto, currency), true],
    ...(invoice ? [["Pagos confirmados", money(paid, currency)], [paid > Number(order.monto) ? "Saldo a favor" : "Saldo pendiente", money(Math.abs(Number(order.monto) - paid), currency)]] : []),
  ];
  const body = `${header({ company, title, number: order.id, date: orderDate,
    extra: order.fechaVencimiento ? `<div class="line">${invoice ? "Vencimiento" : "Válida hasta"}: ${esc(documentDate(purchaseDate(order.fechaVencimiento)))}</div>` : (!invoice ? '<div class="line">Vigencia: no registrada; confirmar por escrito.</div>' : ""),
  })}<p class="notice">${invoice ? "Documento comercial de cobro. No constituye una factura fiscal autorizada ni la reemplaza." : "Propuesta comercial. No constituye factura fiscal ni confirmación de disponibilidad."}</p>
<div class="meta">${clientPanel(order.cliente)}<section class="panel"><h2>Datos del documento</h2><p>Estado: ${esc(String(order.estado || "pendiente").replaceAll("_", " "))}</p><p>Moneda: ${esc(currency)}</p><p>Tipo: ${invoice ? "Venta comercial · no fiscal" : "Cotización"}</p><p>Impuestos: sin desglose fiscal en esta orden; confirmar condiciones.</p></section></div>
${facts([["Código cliente", order.clienteId || order.cliente?.id], ["RTN", order.cliente?.rtn], ["Referencia", order.id], ["Términos", "Ver notas / condiciones"], ["Vendedor", order.createdBy], ["Moneda", currency === "L" || currency === "HNL" ? "Nacional · L" : currency], ["Tipo comprobante", invoice ? "Venta comercial no fiscal" : "Cotización"], ["Almacén", "Ver movimientos registrados"]])}
${items.length ? lineGrid(items, currency) : '<p class="notice">Detalle de productos pendiente de especificar.</p>'}
<section class="document-end" aria-label="Totales y cierre">${closingSummary(totalRows, `${notes(order.notas)}
${invoice && confirmed.length ? `<section class="notes"><h2>Pagos confirmados</h2>${confirmed.map(pago => `${esc(documentDate(pago.fecha))} · ${esc(pago.metodo)} · ${money(pago.monto, currency)}${pago.referencia ? ` · Ref.: ${esc(pago.referencia)}` : ""}`).join("\n")}</section>` : ""}`)}
${closingAmount(order.monto)}${footer()}</section>`;
  return docShell({ title: `${title} ${order.id} · ${company.name}`, body, ...options });
}

export function renderFiscalDocument({ documento, settings = {}, ...options }) {
  const company = companyData(settings);
  const title = { factura: "Factura", nota_credito: "Nota de crédito", nota_debito: "Nota de débito" }[documento.tipo] || "Documento fiscal";
  const currency = documento.moneda === "HNL" || !documento.moneda ? "L" : documento.moneda;
  const pending = !documento.cai || !documento.correlativo;
  const items = documento.items || [];
  const taxGroups = new Map();
  for (const item of items) {
    const rate = Number(item.impuestoPorcentaje);
    const tax = Math.round((Number(item.subtotal) * rate / 100 + Number.EPSILON) * 100) / 100;
    taxGroups.set(rate, (taxGroups.get(rate) || 0) + tax);
  }
  // El subtotal persistido ya es neto del descuento. No restarlo dos veces.
  const totalRows = [
    ["Importe antes de descuentos", money(Number(documento.subtotal) + Number(documento.descuento), currency)],
    ["Descuento", money(documento.descuento, currency)],
    ["Subtotal neto", money(documento.subtotal, currency)],
    ...[...taxGroups].filter(([rate]) => rate > 0).map(([rate, amount]) => [`ISV ${rate}%`, money(amount, currency)]),
    ["ISV total", money(documento.impuesto, currency)],
    ["TOTAL", money(documento.total, currency), true],
  ];

  // No atribuirle a una factura antigua el CAI ni el rango de la configuración
  // actual. Solo usar datos vigentes si coinciden CAI y serie del registro.
  const sameAuthorization = Boolean(documento.cai && documento.cai === settings["fiscal.cai"] && documento.serie === settings["fiscal.serie"]);
  const rangeStart = sameAuthorization ? settings["fiscal.rangoInicio"] : null;
  const rangeEnd = sameAuthorization ? settings["fiscal.rangoFin"] : null;
  const deadline = sameAuthorization ? settings["fiscal.fechaLimite"] : null;
  const body = `${header({ company, title, number: documento.correlativo || documento.id, date: documento.fecha })}
${pending ? '<p class="notice"><strong>SIN VALIDEZ FISCAL · PENDIENTE DE CAI O NUMERACIÓN AUTORIZADA.</strong> Los datos de autorización deben registrarse al emitir el documento; no se asignan al imprimir.</p>' : ""}
${documento.estado === "anulado" ? `<div class="void">ANULADO · ${esc(documento.motivoAnulacion || "Sin motivo registrado")}${documento.anuladoAt ? `<br>Fecha: ${esc(documentDate(documento.anuladoAt))}` : ""}</div>` : ""}
<div class="meta">${clientPanel(documento.cliente)}<section class="panel"><h2>Referencia</h2><p>Estado: ${esc(documento.estado)}</p><p>Moneda: ${esc(documento.moneda || "HNL")}</p>${documento.ordenId ? `<p>Orden: ${esc(documento.ordenId)}</p>` : ""}${documento.referenciaId ? `<p>Documento relacionado: ${esc(documento.referenciaId)}</p>` : ""}<p>Emitido por: ${esc(documento.emitidoPor || "No registrado")}</p></section></div>
${facts([["Código cliente", documento.clienteId || documento.cliente?.id], ["RTN", documento.cliente?.rtn], ["Referencia", documento.ordenId || documento.referenciaId], ["Términos", "Ver notas / condiciones"], ["Vendedor / emitido por", documento.emitidoPor], ["Moneda", documento.moneda === "HNL" || !documento.moneda ? "Nacional · L" : documento.moneda], ["Tipo comprobante", title], ["Almacén", "Ver movimientos registrados"]])}
${lineGrid(items, currency, "fiscal")}
<section class="document-end" aria-label="Totales y cierre">${closingSummary(totalRows, `${notes(documento.orden?.notas, "Notas del pedido")}
<section class="authorization"><p><strong>Autorización fiscal</strong></p><p>CAI: ${esc(documento.cai || "Pendiente de asignación")}</p><p>Serie: ${esc(documento.serie || "No registrada")}</p><p>Rango autorizado: ${rangeStart && rangeEnd ? `${esc(rangeStart)} al ${esc(rangeEnd)}` : "No registrado en este documento"}</p><p>Fecha límite de emisión: ${esc(documentDate(deadline))}</p>${!pending && (!rangeStart || !rangeEnd || !deadline) ? '<p>Verifique los datos de autorización faltantes antes de utilizar este documento como comprobante fiscal.</p>' : ""}</section>`)}
${closingAmount(documento.total)}${footer(documento.pdfHash)}</section>`;
  return docShell({ title: `${title} ${documento.correlativo || documento.id} · ${company.name}`, body, ...options });
}


export function renderPurchaseDocument({ order, settings = {}, ...options }) {
  const company = companyData(settings), quote = order.tipo === "cotizacion", title = quote ? "Cotización a proveedor" : "Orden de compra";
  const body = `${header({ company, title, number: order.numero, date: purchaseDate(order.fecha) })}
<p class="notice">${quote ? "Solicitud / estimación de compra a proveedor. No es una cotización de venta ni crea existencias o pagos." : "Orden de compra. No es la factura fiscal del proveedor ni acredita pago o recepción."}</p>
<div class="meta">${clientPanel({ ...order.proveedor, correo: order.proveedor?.email }, "Requerido a · Proveedor")}<section class="panel"><h2>Condiciones de abastecimiento</h2><p>Atención: ${esc(order.requeridoA || "No registrada")}</p><p>Estado: ${esc(order.estado)}</p><p>Envío: ${esc(order.envio || "No registrado")}</p><p>Entrega esperada: ${esc(documentDate(purchaseDate(order.fechaEsperada)))}</p></section></div>
${facts([["Proveedor", order.proveedor?.nombre], ["Términos", paymentTerms(order)], ["Factura proveedor", order.facturaProveedor], ["Moneda", "Nacional · L"], ["Compra relacionada", order.compraGenerada?.numero || order.cotizacionOrigen?.numero], ["Vencimiento crédito", documentDate(purchaseDate(order.fechaVencimiento))], ["Preparado por", order.createdBy], ["Tipo", title]])}
${lineGrid(order.items || [], "L", "purchase")}
<section class="document-end" aria-label="Totales y cierre">${closingSummary([["Subtotal neto", money(order.subtotal)], ["ISV", money(order.impuesto)], [quote ? "TOTAL ESTIMADO" : "TOTAL COMPRA", money(order.total), true]], `${notes(order.notas)}
<section class="authorization"><p>Contado/crédito describe términos, no pagos realizados.</p><p>Las existencias sólo cambian al registrar una recepción en la bodega destino.</p></section>`)}${closingAmount(order.total)}${footer()}</section>`;
  return docShell({ title: `${title} ${order.numero} · ${company.name}`, body, ...options });
}
