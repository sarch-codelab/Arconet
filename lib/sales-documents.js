// DTO de lectura únicamente. Un histórico comercial nunca se transforma en
// fiscal: mantiene id, importe y snapshots; cada fuente conserva su API.
export function salesDocuments(orders = [], fiscales = []) {
  return [
    ...orders.filter(order => order.tipo !== "factura").map(order => ({ ...order, sourceKey: `orden:${order.id}` })),
    ...fiscales.map(doc => ({
      sourceKey: `fiscal:${doc.id}`, id: doc.id, numero: doc.correlativo || doc.id,
      tipo: "venta", fiscal: doc, clienteId: doc.clienteId,
      cliente: doc.cliente?.nombre || "Sin cliente", clienteObj: doc.cliente,
      fecha: doc.fecha, estado: doc.estado === "anulado" ? "cancelada" : "completada",
      monto: (doc.tipo === "nota_credito" ? -1 : 1) * Number(doc.total), notas: doc.motivoAnulacion || "",
      items: (doc.items || []).map(item => ({ ...item, nombre: item.descripcion })),
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function salesSummary(documents = []) {
  const quotes = documents.filter(doc => doc.tipo === "cotizacion");
  const liveSales = documents.filter(doc => doc.tipo === "venta" && doc.estado !== "cancelada" && (!doc.fiscal || doc.fiscal.tipo === "factura"));
  // Un vínculo fiscal antiguo no suma por segunda vez la misma venta comercial.
  const linkedOrders = new Set(liveSales.map(doc => doc.fiscal?.ordenId).filter(Boolean));
  const counted = documents.filter(doc => doc.estado !== "cancelada" && (doc.fiscal || !linkedOrders.has(doc.id)));
  return {
    total: quotes.length,
    pendientes: quotes.filter(doc => doc.estado === "pendiente").length,
    ventas: liveSales.filter(doc => doc.fiscal || !linkedOrders.has(doc.id)).length,
    totalMonto: counted.reduce((sum, doc) => sum + Number(doc.monto || 0), 0),
  };
}

export function fiscalTypeLabel(doc) {
  return ({ factura: "Factura fiscal", nota_credito: "Nota de crédito", nota_debito: "Nota de débito" })[doc.tipo] || doc.tipo;
}
