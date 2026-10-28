import { prisma } from '@/lib/prisma';
import { requireClientSession } from '@/lib/portal-cliente';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (value, currency = "L") => `${currency} ${Number(value || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Documento (cotización o factura) de la propia orden del cliente.
 * Mismo render que el documento de admin, pero autenticado por sesión de
 * cliente y validando que la orden pertenezca al cliente (anti-IDOR).
 */
export async function GET(request, { params }) {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const { id } = await params;
    const [order, config] = await Promise.all([
      prisma.orden.findFirst({
        where: { id, clienteId: session.clienteId },
        include: { cliente: true, items: true },
      }),
      prisma.configuracionSistema.findMany({ where: { clave: { in: ["companyName", "email", "phone", "currency"] } }, select: { clave: true, valor: true } }),
    ]);
    if (!order) return new Response("Documento no encontrado", { status: 404 });
    const settings = Object.fromEntries(config.map(({ clave, valor }) => [clave, valor]));
    const company = settings.companyName || "Arcolab";
    const currency = settings.currency || "L";
    const rows = order.items.map((item) => `<tr><td>${esc(item.nombre)}</td><td>${esc(item.cantidad)}</td><td>${money(item.precio, currency)}</td><td>${money(Number(item.cantidad) * Number(item.precio), currency)}</td></tr>`).join("");
    const isInvoice = order.tipo === "venta";
    const documentTitle = isInvoice ? "Factura comercial" : "Cotización";
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${documentTitle} ${esc(order.id)} · ${esc(company)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#172033;font:14px/1.55 Arial,sans-serif}.sheet{max-width:850px;min-height:1050px;margin:28px auto;padding:56px 64px;background:#fff;box-shadow:0 12px 50px #17203320}.tools{max-width:850px;margin:18px auto;text-align:right}.tools button{padding:12px 18px;border:0;border-radius:9px;background:#1544b5;color:white;font-weight:700;cursor:pointer}.brand{display:flex;justify-content:space-between;align-items:center;gap:24px;padding-bottom:28px;border-bottom:2px solid #1544b5}.brand img{width:190px;height:auto}.tag{color:#1544b5;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.title{margin:34px 0 20px;font-size:30px;letter-spacing:-.04em}.meta,.party{display:grid;grid-template-columns:1fr 1fr;gap:20px}.block{padding:18px;border:1px solid #e4e9f1;border-radius:12px}.block h2{margin:0 0 8px;color:#667085;font-size:10px;letter-spacing:.1em;text-transform:uppercase}.block p{margin:2px 0}.table{width:100%;margin:30px 0;border-collapse:collapse}.table th,.table td{padding:12px 9px;border-bottom:1px solid #e7ebf1;text-align:left}.table th{color:#667085;font-size:10px;text-transform:uppercase}.table th:not(:first-child),.table td:not(:first-child){text-align:right}.total{width:min(350px,100%);margin-left:auto;padding:18px;border-radius:12px;background:#f4f7fc}.total div{display:flex;justify-content:space-between;gap:16px;font-size:20px;font-weight:800}.notes{margin-top:28px;color:#667085}.notice{margin-top:36px;padding:12px 15px;border-left:3px solid #1544b5;background:#f4f7fc;color:#42506a;font-size:12px}.foot{margin-top:64px;padding-top:18px;border-top:1px solid #e4e9f1;color:#667085;font-size:11px}@media(max-width:620px){.sheet{min-height:0;margin:0;padding:28px 20px}.meta,.party{grid-template-columns:1fr}.brand img{width:140px}.title{font-size:24px}}@media print{body{background:white}.tools{display:none}.sheet{max-width:none;min-height:0;margin:0;padding:12mm 14mm;box-shadow:none}.notice{break-inside:avoid}}
      </style></head><body><div class="tools"><button onclick="window.print()">Imprimir o guardar como PDF</button></div><main class="sheet"><header class="brand"><img src="${new URL("/arconet.png", request.url).href}" alt="Arconet"><div><div class="tag">${isInvoice ? "Documento comercial · No fiscal" : "Propuesta comercial"}</div><strong>${esc(company)}</strong><br>${esc(settings.email || "")}</div></header><h1 class="title">${documentTitle}</h1><section class="meta"><div class="block"><h2>Documento</h2><p><b>Número:</b> ${esc(order.id)}</p><p><b>Fecha:</b> ${esc(new Date(order.fecha).toLocaleDateString("es-HN"))}</p><p><b>Estado:</b> ${esc(order.estado.replaceAll("_", " "))}</p></div><div class="block"><h2>Cliente</h2><p><b>${esc(order.cliente.nombre)}</b></p><p>${esc(order.cliente.rtn ? `RTN: ${order.cliente.rtn}` : "")}</p><p>${esc(order.cliente.correo || "")}</p><p>${esc(order.cliente.telefono || "")}</p><p>${esc(order.cliente.direccion || "")}</p></div></section>${rows ? `<table class="table"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table>` : "<p class=\"notes\">Detalle de productos pendiente de especificar.</p>"}<section class="total"><div><span>${isInvoice ? "Total comercial" : "Total estimado"}</span><span>${money(order.monto, currency)}</span></div></section>${order.notas ? `<p class="notes"><b>Notas:</b> ${esc(order.notas)}</p>` : ""}<p class="notice">${isInvoice ? "Documento comercial de cobro. No constituye comprobante fiscal autorizado ni reemplaza una factura fiscal." : "Documento de cotización para revisión comercial. No constituye comprobante fiscal, factura autorizada ni confirmación de disponibilidad."}</p><footer class="foot">${esc(company)}<br>Arconet es la marca comercial en transición de Arcolab.</footer></main></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/cliente-portal/documentos/[id]", error?.message);
    return new Response("No se pudo generar el documento", { status: 503 });
  }
}
