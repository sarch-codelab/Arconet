import { prisma } from "../../../../../../lib/prisma";
import { requirePermission } from "../../../../../../lib/dal";
import { obtenerConfigFiscal } from "../../../../../../lib/facturacion";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (value) => `L ${Number(value ?? 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TIPO_LABEL = { factura: "FACTURA", nota_credito: "NOTA DE CRÉDITO", nota_debito: "NOTA DE DÉBITO" };

/**
 * Logo embebido como data-URL. En la impresion del navegador una ruta
 * relativa (/arconet.png) no siempre resuelve —el documento se abre como
 * archivo o iframe— y el logo desaparecia. Leyendo el PNG desde /public y
 * codificandolo en base64 garantizamos que SIEMPRE aparezca, incluso con
 * "Imprimir en escala de grises" activada (print-color-adjust: exact).
 */
function logoDataUrl() {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "arconet.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Documento fiscal como HTML listo para imprimir (el navegador guarda como
 * PDF). Diseno premium en blanco y negro: hoja A4 completa, tipografia
 * sobria, filetes finos y sellos monocromaticos. La huella SHA-256 en el pie
 * permite verificar la inmutabilidad del documento contra el registro
 * almacenado.
 */
export async function GET(request, { params }) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  const { id } = await params;

  try {
    const [documento, config, contactoFilas] = await Promise.all([
      prisma.documentoFiscal.findUnique({
        where: { id },
        include: { cliente: true, items: true, orden: { select: { id: true, notas: true } } },
      }),
      obtenerConfigFiscal(),
      // Datos de contacto de la empresa (Ajustes del sitio) para el pie.
      prisma.configuracionSistema.findMany({
        where: { clave: { in: ["email", "phone"] } },
        select: { clave: true, valor: true },
      }),
    ]);
    if (!documento) return Response.json({ error: "Documento no encontrado." }, { status: 404 });

    const contacto = Object.fromEntries(contactoFilas.map(({ clave, valor }) => [clave, valor]));

    const { searchParams } = new URL(request.url);
    const auto = searchParams.get("auto") === "1";

    const filas = documento.items
      .map(
        (item, index) => `
        <tr class="${index % 2 === 1 ? "alt" : ""}">
          <td>${esc(item.descripcion)}</td>
          <td class="num">${Number(item.cantidad)}</td>
          <td class="num">${money(item.precio)}</td>
          <td class="num">${money(item.descuento)}</td>
          <td class="num">${Number(item.impuestoPorcentaje)}%</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>`
      )
      .join("");

    const numero = documento.correlativo || "—";
    const anulado = documento.estado === "anulado";
    const avisoCai = !documento.cai
      ? `<div class="aviso"><strong>AVISO:</strong> Documento pendiente de CAI. Configure el rango autorizado (CAI + serie + correlativo) en Ajustes → Fiscal para emitir con numeración oficial.</div>`
      : "";

    const logo = logoDataUrl();

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<title>${TIPO_LABEL[documento.tipo] || "Documento"} ${esc(numero)}</title>
<style>
  /* ---- Factura premium monocromatica (blanco y negro puro) ---- */
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; }
  body { font-family: Georgia, "Times New Roman", "Palatino Linotype", serif; color: #111; margin: 0; }
  .sheet { max-width: 794px; min-height: 1123px; margin: 20px auto; padding: 48px 52px; background: #fff; border: 1px solid #d9d9d9; }
  @media print { .sheet { max-width: none; min-height: 0; margin: 0; padding: 0; border: 0; } body { font-size: 12.5px; } }

  .emisor-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; }
  .emisor { font-size: 13px; line-height: 1.65; color: #222; }
  .emisor img { display: block; width: 170px; height: auto; margin-bottom: 14px; filter: grayscale(100%) contrast(1.1); }
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
  .items td { padding: 10px 12px; border-bottom: 1px solid #e3e3e3; text-align: left; vertical-align: top; }
  .items tr.alt td { background: #fafafa; }
  .num { text-align: right; white-space: nowrap; }
  .items tbody tr:last-child td { border-bottom: 2px solid #000; }

  .totals { display: flex; justify-content: flex-end; margin-top: 18px; }
  .totals table { width: 330px; border-collapse: collapse; font-size: 13px; }
  .totals td { padding: 8px 14px; border-bottom: 1px solid #e3e3e3; }
  .totals .grand td { font-weight: 700; font-size: 16px; color: #000; background: #f2f2f2; border-top: 2px solid #000; border-bottom: 3px double #000; letter-spacing: .04em; }

  .aviso { margin-top: 18px; padding: 12px 16px; border: 1px dashed #555; font-size: 12px; color: #222; background: #fafafa; }
  .sello-anulado { position: relative; margin: 18px auto 0; width: fit-content; padding: 8px 26px; border: 3px double #000; transform: rotate(-2deg); font-family: Helvetica, Arial, sans-serif; font-weight: 700; letter-spacing: .25em; font-size: 15px; color: #000; }

  .notas { margin-top: 20px; font-size: 12px; color: #333; line-height: 1.6; }
  .notas .label { font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; color: #000; display: block; margin-bottom: 4px; }

  .footer { margin-top: 30px; padding-top: 14px; border-top: 3px double #000; font-size: 10.5px; color: #333; display: flex; justify-content: space-between; gap: 24px; }
  .footer .hash { font-family: "Courier New", monospace; word-break: break-all; max-width: 46%; }
  .gracias { text-align: center; margin-top: 22px; font-size: 13px; letter-spacing: .3em; text-transform: uppercase; color: #000; }

  .no-print { text-align: center; margin: 18px 0; font-family: Helvetica, Arial, sans-serif; }
  .no-print button { padding: 10px 22px; border: 1px solid #000; border-radius: 6px; background: #fff; color: #000; font-size: 14px; cursor: pointer; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="emisor-row reg">
    <div class="emisor">
      ${logo ? `<img src="${logo}" alt="Logo ${esc(config.nombre || "Arconet, S.A.")}" />` : ""}
      <p class="razon">${esc(config.nombre || "ARCONET, S.A.")}</p>
      San Pedro Sula, Cortés · Honduras<br />
      ${config.nit ? `RTN / NIT: ${esc(config.nit)}<br />` : ""}
      ${config.direccion ? `${esc(config.direccion)}<br />` : ""}
      ${contacto.phone ? `Tel: ${esc(contacto.phone)}` : ""}${contacto.phone && contacto.email ? " · " : ""}${contacto.email ? esc(contacto.email) : ""}
    </div>
    <div class="doc-box">
      <span class="tipo">${TIPO_LABEL[documento.tipo] || "DOCUMENTO"}</span><br /><br />
      Número<br />
      <span class="numero">${esc(numero)}</span><br />
      ${documento.cai ? `CAI: ${esc(documento.cai)}<br />` : ""}
      Fecha de emisión: ${new Date(documento.fecha).toLocaleDateString("es-HN")}
    </div>
  </div>

  ${avisoCai}
  ${anulado ? `<div class="sello-anulado">ANULADO · ${esc(documento.motivoAnulacion || "")}</div>` : ""}

  <div class="meta">
    <div class="panel doble">
      <span class="label">Cliente</span>
      <div class="linea">
        <strong>${esc(documento.cliente?.nombre || "—")}</strong><br />
        ${documento.cliente?.rtn ? `RTN: ${esc(documento.cliente.rtn)}<br />` : ""}
        ${esc(documento.cliente?.direccion || "")}${documento.cliente?.ciudad ? ` · ${esc(documento.cliente.ciudad)}` : ""}
      </div>
    </div>
    <div class="panel right">
      <span class="label">Referencia</span>
      <div class="linea">
        ${documento.ordenId ? `Orden: ${esc(documento.ordenId)}<br />` : ""}
        Emitido por: ${esc(documento.emitidoPor || "—")}<br />
        Estado: ${esc(documento.estado || "emitido")}
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Descuento</th><th class="num">ISV</th><th class="num">Subtotal</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="num">${money(documento.subtotal)}</td></tr>
      <tr><td>Descuento</td><td class="num">${money(documento.descuento)}</td></tr>
      <tr><td>ISV</td><td class="num">${money(documento.impuesto)}</td></tr>
      <tr class="grand"><td>TOTAL</td><td class="num">${money(documento.total)}</td></tr>
    </table>
  </div>

  ${documento.orden?.notas ? `<div class="notas"><span class="label">Notas del pedido</span>${esc(documento.orden.notas)}</div>` : ""}

  <div class="footer">
    <div>
      Documento generado el ${new Date().toLocaleString("es-HN")}<br />
      ${documento.ordenId ? `Origen: orden ${esc(documento.ordenId)}<br />` : ""}
      Este documento es válido como comprobante fiscal sujeto a las disposiciones del SARE.
    </div>
    <div class="hash">
      Huella SHA-256 de verificación:<br />${esc(documento.pdfHash || "—")}
    </div>
  </div>

  <div class="gracias">Gracias por su preferencia</div>
</div>
${auto ? `<script>window.addEventListener("load", () => { setTimeout(() => window.print(), 300); });</script>` : `<div class="no-print"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>`}
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${documento.correlativo || documento.id}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/facturacion/documentos/[id]/pdf", error?.message);
    return Response.json({ error: "No se pudo generar el documento." }, { status: 500 });
  }
}
