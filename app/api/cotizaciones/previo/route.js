import { prisma } from "@/lib/prisma";
import { DOCUMENT_HEADERS, DOCUMENT_SETTINGS_KEYS, huellaCotizacion, printOptions, renderOrderDocument } from "@/lib/print-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vista previa pública de cotización: toma los productos del carrito de la
// tienda (los slugs son los ids de producto) y renderiza el mismo documento
// HTML que el panel administrativo imprime como PDF. Sin sesión: es un
// documento de cierre para el cliente, no un registro de la base.

const MAX_ITEMS = 50;

function referencia() {
  const fecha = new Date();
  const base = `${fecha.getUTCFullYear()}${String(fecha.getUTCMonth() + 1).padStart(2, "0")}${String(fecha.getUTCDate()).padStart(2, "0")}`;
  const aleatorio = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `COT-${base}-${aleatorio}`;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const entradas = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];
    if (!entradas.length) {
      return new Response(JSON.stringify({ error: "El carrito está vacío." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const slugs = entradas.map((item) => String(item.slug || "").trim()).filter(Boolean);
    const [productos, config] = await Promise.all([
      prisma.producto.findMany({
        where: { id: { in: slugs } },
        select: { id: true, nombre: true, sku: true, precio: true, unidad: true, descripcion: true },
      }),
      prisma.configuracionSistema.findMany({
        where: { clave: { in: DOCUMENT_SETTINGS_KEYS } },
        select: { clave: true, valor: true },
      }),
    ]);

    const porId = new Map(productos.map((producto) => [producto.id, producto]));
    const items = entradas
      .map((entrada) => {
        const producto = porId.get(String(entrada.slug).trim());
        if (!producto) return null;
        const cantidad = Math.max(1, Math.floor(Number(entrada.cantidad) || 1));
        const precio = Number(producto.precio) || 0;
        return {
          nombre: producto.nombre,
          descripcion: producto.descripcion || producto.nombre,
          sku: producto.sku,
          producto: { sku: producto.sku, unidad: producto.unidad },
          unidad: producto.unidad,
          cantidad,
          precio,
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return new Response(JSON.stringify({ error: "Ningún producto del carrito está en el catálogo." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const monto = items.reduce((total, item) => total + Number(item.cantidad) * Number(item.precio), 0);
    const order = {
      tipo: "cotizacion",
      id: referencia(),
      fecha: new Date().toISOString(),
      cliente: {},
      clienteId: null,
      estado: "borrador",
      createdBy: null,
      descuento: 0,
      monto,
      notas: "",
      items,
    };

    // Huella del contenido impreso: la misma que firma el PDF del panel.
    const hash = huellaCotizacion(order);
    const html = renderOrderDocument({ order, settings: Object.fromEntries(config.map(({ clave, valor }) => [clave, valor])), hash, ...printOptions(request) });
    return new Response(html, { headers: DOCUMENT_HEADERS });
  } catch (error) {
    console.error("POST /api/cotizaciones/previo", error?.message);
    return new Response(JSON.stringify({ error: "No se pudo generar la cotización." }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}
