// Plantilla compartida de documentos imprimibles del panel.
//
// Tanto la FACTURA FISCAL (/api/facturacion/documentos/[id]/pdf) como la
// COTIZACION / VENTA COMERCIAL (/api/ordenes/[id]/documento) usan este mismo
// diseno premium en blanco y negro: hoja A4 completa, tipografia sobria,
// filetes dobles y logo embebido como data-URL para que SIEMPRE aparezca al
// imprimir o guardar como PDF (una ruta relativa no resuelve cuando el
// documento se abre desde iframe o como archivo descargado).

import { readFileSync } from "fs";
import { join } from "path";

export const money = (value, currency = "L") =>
  `${currency} ${Number(value ?? 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);

/** Logo de la empresa embebido en base64 (null si el PNG no existe). */
export function logoDataUrl(fileName = "arconet.png") {
  try {
    const buf = readFileSync(join(process.cwd(), "public", fileName));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** CSS monocromatico comun a todos los documentos imprimibles. */
export const DOC_CSS = `
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Georgia, "Times New Roman", "Palatino Linotype", serif; color: #111; margin: 0; }
  .sheet { max-width: 794px; min-height: 1123px; margin: 20px auto; padding: 48px 52px; background: #fff; border: 1px solid #d9d9d9; }
  @media print { .sheet { max-width: none; min-height: 0; margin: 0; padding: 0; border: 0; } body { font-size: 12.5px; } }

  .emisor-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; }
  .emisor { font-size: 13px; line-height: 1.65; color: #222; }
  .emisor img { display: block; width: 170px; height: auto; margin-bottom: 14px; /* Filtro B/N forzado SIEMPRE, tanto en pantalla como al imprimir:
     el logo original es a color y, sin esta linea, la vista previa del navegador
     y el PDF salian a color aunque la hoja sea blanco y negro. */
     -webkit-filter: grayscale(100%) contrast(1.15) brightness(1.02); filter: grayscale(100%) contrast(1.15) brightness(1.02); }
  .emisor .razon { font-size: 16px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #000; margin: 0 0 4px; }
  .doc-box { text-align: right; font-size: 12.5px; line-height: 1.9; color: #222; min-width: 230px; }
  .doc-box .tipo { display: inline-block; padding: 7px 18px; border: 2px solid #000; font-family: Helvetica, Arial, sans-serif; font-weight: 700; letter-spacing: .18em; font-size: 13px; text-transform: uppercase; color: #000; background: #fff; }
  .doc-box .numero { font-size: 17px; font-weight: 700; color: #000; letter-spacing: .03em; }
  .reg { margin-top: 14px; padding-top: 12px; border-top: 3px double #000; }

  .meta { display: flex; justify-content: space-between; gap: 20px; margin: 22px 0; }
  .panel { flex: 1; padding: 14px 18px; border: 1px solid #bbb; }
  .panel.doble { border: 3px double #000; }
  .panel .label { font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #000; font-weight: 700; display: block; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .panel.right { text-align: right; }
  .panel .linea { line-height: 1.65; font-size: 13px; }

  table.items { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
  .items thead th { background: #f2f2f2; color: #000; font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 12px; text-align: left; }
  .items td { padding: 10px 12px; border-bottom: 1px solid #e3e333; text-align: left; vertical-align: top; }
  .items tr.alt td { background: #fafafa; }
  .num { text-align: right; white-space: nowrap; }

  .totals { display: flex; justify-content: flex-end; margin-top: 18px; }
  .totals table { width: 330px; border-collapse: collapse; font-size: 13px; }
  .totals td { padding: 8px 14px; border-bottom: 1px solid #e3e3e3; }
  .totals .grand td { font-weight: 700; font-size: 16px; color: #000; background: #f2f2f2; border-top: 2px solid #000; border-bottom: 3px double #000; letter-spacing: .04em; }

  .aviso { margin-top: 18px; padding: 12px 16px; border: 1px dashed #555; font-size: 12px; color: #222; background: #fafafa; }
  .sello-anulado { position: relative; margin: 18px auto 0; width: fit-content; padding: 8px 26px; border: 3px double #000; transform: rotate(-2deg); font-family: Helvetica, Arial, sans-serif; font-weight: 700; letter-spacing: .25em; font-size: 15px; color: #000; }

  .notas { margin-top: 20px; font-size: 12px; color: #333; line-height: 1.6; }
  .notas .label { font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; color: #000; display: block; margin-bottom: 4px; }

  .footer { margin-top: 30px; padding-top: 14px; border-top: 3px double #000; font-size: 10.5px; color: #223; display: flex; justify-content: space-between; gap: 24px; }
  .footer .hash { font-family: "Courier New", monospace; word-break: break-all; max-width: 46%; }
  .gracias { text-align: center; margin-top: 22px; font-size: 13px; letter-spacing: .3em; text-transform: uppercase; color: #000; }

  .no-print { text-align: center; margin: 18px 0; font-family: Helvetica, Arial, sans-serif; }
  .no-print button { padding: 10px 22px; border: 1px solid #000; border-radius: 6px; background: #fff; color: #000; font-size: 14px; cursor: pointer; }
  @media print { .no-print { display: none !important; } }

  /* Seguridad final: en la impresion, TODO el contenido del documento se
     renderiza en escala de grises (no solo las imagenes). Asi, aunque el
     navegador tenga activada la opcion "Color" o algun elemento conserve
     un tinte a color, la cotizacion/venta SIEMPRE sale en blanco y negro. */
  @media print {
    html, body, * {
      filter: grayscale(100%) !important;
      -webkit-filter: grayscale(100%) !important;
    }
  }
`;

/** Encabezado comun: logo + datos del emisor a la izquierda, caja del documento a la derecha. */
export function headerBlock({ logo, razon, nit, direccion, phone, email, tipoLabel, numero, cai, fecha, extraLineas = "" }) {
  return `
  <div class="emisor-row reg">
    <div class="emisor">
      ${logo ? `<img src="${logo}" alt="Logo ${esc(razon)}" />` : ""}
      <p class="razon">${esc(razon)}</p>
      San Pedro Sula, Cortés · Honduras<br />
      ${nit ? `RTN / NIT: ${esc(nit)}<br />` : ""}
      ${direccion ? `${esc(direccion)}<br />` : ""}
      ${phone ? `Tel: ${esc(phone)}` : ""}${phone && email ? " · " : ""}${email ? esc(email) : ""}
    </div>
    <div class="doc-box">
      <span class="tipo">${esc(tipoLabel)}</span><br /><br />
      Número<br />
      <span class="numero">${esc(numero)}</span><br />
      ${cai ? `CAI: ${esc(cai)}<br />` : ""}
      Fecha de emisión: ${esc(fecha)}
      ${extraLineas}
    </div>
  </div>`;
}

/** Panel Cliente / Referencia bajo el encabezado. */
export function metaPanels({ clienteHtml, referenciaHtml }) {
  return `
  <div class="meta">
    <div class="panel doble">
      <span class="label">Cliente</span>
      <div class="linea">${clienteHtml}</div>
    </div>
    <div class="panel right">
      <span class="label">Referencia</span>
      <div class="linea">${referenciaHtml}</div>
    </div>
  </div>`;
}

export function totalsBlock(rows) {
  return `
  <div class="totals">
    <table>${rows}</table>
  </div>`;
}

export function footerBlock({ generado, origen, validez, hash }) {
  return `
  <div class="footer">
    <div>
      Documento generado el ${esc(generado)}<br />
      ${origen ? `Origen: ${esc(origen)}<br />` : ""}
      ${validez}
    </div>
    ${hash ? `<div class="hash">Huella SHA-256 de verificación:<br />${esc(hash)}</div>` : ""}
  </div>
  <div class="gracias">Gracias por su preferencia</div>`;
}

/** Envolvente HTML completa con boton de impresion opcional. */
export function docShell({ title, css = DOC_CSS, body, autoPrint = false }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body>
<div class="sheet">${body}</div>
${autoPrint ? `<script>window.addEventListener("load", () => { setTimeout(() => window.print(), 300); });</script>` : `<div class="no-print"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>`}
</body>
</html>`;
}