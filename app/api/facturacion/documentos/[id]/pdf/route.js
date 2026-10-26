import { prisma } from "../../../../../../lib/prisma";
import { requirePermission } from "../../../../../../lib/dal";
import { obtenerConfigFiscal } from "../../../../../../lib/facturacion";

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
 * Documento fiscal como HTML listo para imprimir (el navegador guarda como
 * PDF). La huella SHA-256 en el pie permite verificar la inmutabilidad del
 * documento contra el registro almacenado.
 */
export async function GET(request, { params }) {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  const { id } = await params;

  try {
    const [documento, config] = await Promise.all([
      prisma.documentoFiscal.findUnique({
        where: { id },
        include: { cliente: true, items: true, orden: { select: { id: true } } },
      }),
      obtenerConfigFiscal(),
    ]);
    if (!documento) return Response.json({ error: "Documento no encontrado." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const auto = searchParams.get("auto") === "1";

    const filas = documento.items
      .map(
        (item) => `
        <tr>
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
      ? `<p class="aviso">Documento pendiente de CAI: configurá el rango autorizado (CAI + serie + correlativo) en Ajustes → Fiscal para emitir con numeración oficial.</p>`
      : "";

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${TIPO_LABEL[documento.tipo] || "Documento"} ${esc(numero)}</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; }
  .page { max-width: 800px; margin: 0 auto; padding: 28px 32px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1544b5; padding-bottom: 14px; }
  .head h1 { margin: 0; font-size: 13px; letter-spacing: .12em; color: #1544b5; }
  .emisor { font-size: 13px; line-height: 1.6; }
  .emisor strong { display: block; font-size: 16px; }
  .doc-box { text-align: right; font-size: 12px; line-height: 1.8; }
  .doc-box .tipo { display: inline-block; padding: 6px 14px; border-radius: 6px; background: #1544b5; color: #fff; font-weight: 700; letter-spacing: .1em; }
  .anulado { background: #b91c1c; }
  .meta { display: flex; justify-content: space-between; gap: 18px; margin: 18px 0; font-size: 13px; }
  .meta div { line-height: 1.7; }
  .meta strong { font-size: 12px; color: #6b7280; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .num { text-align: right; white-space: nowrap; }
  .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals table { width: 320px; }
  .totals td { padding: 6px 10px; }
  .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
  .aviso { margin-top: 14px; padding: 10px 14px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #6b7280; display: flex; justify-content: space-between; gap: 16px; }
  .footer .hash { font-family: ui-monospace, monospace; word-break: break-all; }
  .sello { margin-top: 8px; font-size: 11px; color: #b91c1c; font-weight: 600; }
  @media print { .no-print { display: none !important; } }
  .no-print { text-align: center; margin: 18px 0; }
  .no-print button { padding: 10px 22px; border: 0; border-radius: 8px; background: #1544b5; color: #fff; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<div class="page">
  <div class="head">
    <div class="emisor">
      <h1>${esc(config.nombre || "ARCONET, S.A.")}</h1>
      San Pedro Sula, Cortés · Honduras<br />
      ${config.nit ? `RTN/NIT: ${esc(config.nit)}<br />` : ""}
      ${config.direccion ? esc(config.direccion) : ""}
    </div>
    <div class="doc-box">
      <span class="tipo ${anulado ? "anulado" : ""}">${TIPO_LABEL[documento.tipo] || "DOCUMENTO"}</span><br />
      N°: <strong>${esc(numero)}</strong><br />
      ${documento.cai ? `CAI: ${esc(documento.cai)}<br />` : ""}
      Fecha: ${new Date(documento.fecha).toLocaleDateString("es-HN")}
    </div>
  </div>

  ${avisoCai}
  ${anulado ? `<p class="sello">DOCUMENTO ANULADO · ${esc(documento.motivoAnulacion || "")}</p>` : ""}

  <div class="meta">
    <div>
      <strong>CLIENTE</strong>
      ${esc(documento.cliente?.nombre || "—")}<br />
      ${documento.cliente?.rtn ? `RTN: ${esc(documento.cliente.rtn)}<br />` : ""}
      ${esc(documento.cliente?.direccion || "")}${documento.cliente?.ciudad ? ` · ${esc(documento.cliente.ciudad)}` : ""}
    </div>
    <div style="text-align:right">
      <strong>REFERENCIA</strong>
      ${documento.ordenId ? `Orden: ${esc(documento.ordenId)}<br />` : ""}
      Emitido por: ${esc(documento.emitidoPor || "—")}
    </div>
  </div>

  <table>
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

  <div class="footer">
    <div>
      Documento generado el ${new Date().toLocaleString("es-HN")}<br />
      ${documento.ordenId ? `Origen: orden ${esc(documento.ordenId)}` : ""}
    </div>
    <div class="hash">
      Huella SHA-256:<br />${esc(documento.pdfHash || "—")}
    </div>
  </div>
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
