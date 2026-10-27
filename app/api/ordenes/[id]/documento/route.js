import { prisma } from "../../../../../lib/prisma";
import { requirePermission } from "../../../../../lib/dal";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../../../../lib/contact";
import { esc, money, logoDataUrl, headerBlock, metaPanels, totalsBlock, footerBlock, docShell } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cotizacion / venta comercial como documento imprimible. Usa la MISMA
 * plantilla premium en blanco y negro que la factura fiscal (modulo
 * compartido `_shared.js`): hoja A4 completa, logo embebido en base64 para
 * que nunca falte al imprimir, filetes dobles y sellos monocromaticos.
 */
export async function GET(request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  try {
    const { id } = await params;
    const [order, config] = await Promise.all([
      prisma.orden.findUnique({ where: { id }, include: { cliente: true, items: true } }),
      prisma.configuracionSistema.findMany({
        where: { clave: { in: ["companyName", "email", "phone", "currency", "fiscal.nit", "fiscal.nombre", "fiscal.direccion"] } },
        select: { clave: true, valor: true },
      }),
    ]);
    if (!order) return new Response("Documento no encontrado", { status: 404 });

    const raw = Object.fromEntries(config.map(({ clave, valor }) => [clave, valor]));
    const company = raw["fiscal.nombre"] || raw.companyName || "Arconet, S.A.";
    const currency = raw.currency || "L";
    const isInvoice = order.tipo === "venta";
    const documentTitle = isInvoice ? "Factura comercial" : "Cotización";
    const tipoLabel = isInvoice ? "FACTURA COMERCIAL" : "COTIZACIÓN";

    const filas = order.items
      .map(
        (item, index) => `
        <tr class="${index % 2 === 1 ? "alt" : ""}">
          <td>${esc(item.nombre)}</td>
          <td class="num">${Number(item.cantidad)}</td>
          <td class="num">${money(item.precio, currency)}</td>
          <td class="num">${money(Number(item.cantidad) * Number(item.precio), currency)}</td>
        </tr>`,
      )
      .join("");

    const fechaEmision = new Date(order.fecha).toLocaleDateString("es-HN");

    const body = `${headerBlock({
      logo: logoDataUrl(),
      razon: company,
      nit: raw["fiscal.nit"] || null,
      direccion: raw["fiscal.direccion"] || null,
      phone: raw.phone || CONTACT_PHONE,
      email: raw.email || CONTACT_EMAIL,
      tipoLabel,
      numero: order.id,
      fecha: fechaEmision,
      extraLineas: `<br />Válida hasta: ${esc(new Date(new Date(order.fecha).getTime() + 15 * 864e5).toLocaleDateString("es-HN"))}`,
    })}

    <div class="aviso"><strong>AVISO:</strong> ${isInvoice
      ? "Documento comercial de cobro. No constituye comprobante fiscal autorizado ni reemplaza una factura fiscal. Para emitir una factura fiscal deben configurarse los datos tributarios y la autorización vigentes de la empresa."
      : "Documento de cotización para revisión comercial. No constituye comprobante fiscal, factura autorizada ni confirmación de disponibilidad. Los precios, impuestos, vigencia y condiciones finales se confirman por escrito."}</div>

    ${metaPanels({
      clienteHtml: `<strong>${esc(order.cliente?.nombre || "—")}</strong><br />${order.cliente?.rtn ? `RTN: ${esc(order.cliente.rtn)}<br />` : ""}${esc(order.cliente?.correo || "")}${order.cliente?.correo && order.cliente?.telefono ? " · " : ""}${esc(order.cliente?.telefono || "")}<br />${esc(order.cliente?.direccion || "")}`,
      referenciaHtml: `Estado: ${esc(String(order.estado || "").replaceAll("_", " "))}<br />Fecha: ${esc(fechaEmision)}<br />Tipo: ${isInvoice ? "Venta comercial" : "Propuesta comercial"}`,
    })}

    ${filas
      ? `<table class="items">
    <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio unitario</th><th class="num">Importe</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>`
      : `<p class="notas">Detalle de productos pendiente de especificar.</p>`}

    ${totalsBlock(`<tr class="grand"><td>${isInvoice ? "Total comercial" : "Total estimado"}</td><td class="num">${money(order.monto, currency)}</td></tr>`)}

    ${order.notas ? `<div class="notas"><span class="label">Notas</span>${esc(order.notas)}</div>` : ""}

    ${footerBlock({
      generado: new Date().toLocaleString("es-HN"),
      origen: `documento ${order.id}`,
      validez: "Este documento es válido únicamente como propuesta o registro comercial interno.",
      hash: null,
    })}`;

    const html = docShell({ title: `${documentTitle} ${order.id} · ${company}`, body });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/ordenes/[id]/documento", error?.message);
    return new Response("No se pudo generar el documento", { status: 503 });
  }
}
