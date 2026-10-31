// El rol operativo de Ventas puede cotizar y emitir facturas, pero no
// configurar CAI, anular documentos, cambiar tarifas ni administrar stock.
// Compartido por el seed y las pruebas para ejercitar el rol real, no un admin.
export const DEFAULT_SALES_PERMISSIONS = Object.freeze([
  "productos:read", "precios:read", "clientes:read", "clientes:write",
  "ordenes:read", "ordenes:write", "facturacion:read", "facturacion:emit",
  "reportes:read", "mi-perfil:read", "mi-perfil:write",
]);
