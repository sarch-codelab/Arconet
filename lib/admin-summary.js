// Las cotizaciones no son ventas ni documentos fiscales. Los importes de
// ventas se muestran netos de descuento, no como cobros ya recibidos.
export function summarizeCommercialOrders(orders = []) {
  const quotes = orders.filter(order => order.tipo === "cotizacion");
  const sales = orders.filter(order => order.tipo === "venta" && !["cancelada", "rechazada"].includes(order.estado));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    quotes: quotes.length,
    pendingQuotes: quotes.filter(order => order.estado === "pendiente").length,
    sales: sales.length,
    salesAmount: Math.round(sales.reduce((sum, order) => sum + Math.max(0, number(order.monto) - number(order.descuento)), 0) * 100) / 100,
  };
}
