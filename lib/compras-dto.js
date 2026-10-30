export const SELECT_PURCHASE = {
  id: true,
  numero: true,
  tipo: true,
  proveedorId: true,
  estado: true,
  fecha: true,
  fechaEsperada: true,
  fechaRecepcion: true,
  fechaVencimiento: true,
  requeridoA: true,
  terminos: true,
  diasCredito: true,
  facturaProveedor: true,
  envio: true,
  moneda: true,
  subtotal: true,
  impuesto: true,
  total: true,
  notas: true,
  createdBy: true,
  updatedAt: true,
  proveedor: {
    select: {
      id: true,
      nombre: true,
      rtn: true,
      contacto: true,
      telefono: true,
      email: true,
      direccion: true,
    },
  },
  items: { include: { producto: { select: { sku: true, unidad: true } } } },
  cotizacionOrigen: { select: { id: true, numero: true } },
  compraGenerada: { select: { id: true, numero: true } },
  recepciones: {
    select: {
      id: true,
      bodegaId: true,
      detalle: true,
      actor: true,
      createdAt: true,
      notas: true,
    },
    orderBy: { createdAt: "desc" },
  },
};
// Bodega puede recibir sin obtener importes ni condiciones financieras.
export const SELECT_RECEIVING = {
  id: true,
  numero: true,
  tipo: true,
  estado: true,
  fecha: true,
  fechaEsperada: true,
  envio: true,
  proveedor: { select: { nombre: true } },
  items: {
    select: {
      id: true,
      productoId: true,
      nombre: true,
      cantidad: true,
      cantidadRecibida: true,
      producto: { select: { sku: true, unidad: true } },
    },
  },
};
export function receivingDTO(order) {
  return {
    id: order.id,
    numero: order.numero,
    tipo: order.tipo,
    estado: order.estado,
    fecha: order.fecha,
    fechaEsperada: order.fechaEsperada,
    envio: order.envio,
    proveedor: { nombre: order.proveedor?.nombre },
    items: order.items.map((item) => ({
      id: item.id,
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      cantidadRecibida: item.cantidadRecibida,
      producto: item.producto
        ? { sku: item.producto.sku, unidad: item.producto.unidad }
        : null,
    })),
  };
}
