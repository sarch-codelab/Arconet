// Contratos de los roles operativos incorporados. El seed y las regresiones
// comparten estas listas para probar los roles reales, no un administrador.
// Las migraciones de bases existentes son aditivas para conservar cambios
// personalizados que el administrador haya hecho en la sección Roles.

// Ventas puede cotizar y emitir facturas, pero no configurar CAI, anular
// documentos, cambiar tarifas ni administrar stock.
export const DEFAULT_SALES_PERMISSIONS = Object.freeze([
  "productos:read", "precios:read", "clientes:read", "clientes:write",
  "ordenes:read", "ordenes:write", "facturacion:read", "facturacion:emit",
  "reportes:read", "mi-perfil:read", "mi-perfil:write",
]);

// Gerente mantiene la operación comercial y de inventario. La escritura fiscal
// también conserva sus responsabilidades históricas de gestión/anulación.
// Ajustes está disponible solo para consulta; no se concede su escritura.
export const DEFAULT_MANAGER_PERMISSIONS = Object.freeze([
  "trabajadores:read", "trabajadores:write",
  "productos:read", "precios:read", "productos:write", "precios:write", "productos:delete",
  "categorias:read", "categorias:write", "categorias:delete",
  "sucursales:read", "sucursales:write",
  "clientes:read", "clientes:write", "clientes:delete",
  "ordenes:read", "ordenes:write", "ordenes:delete",
  "inventario:read", "inventario:write",
  "facturacion:read", "facturacion:write",
  "solicitudes:read", "reportes:read", "ajustes:read", "mi-perfil:read", "mi-perfil:write",
]);

// Bodega recibe mercadería y mueve inventario, sin permisos comerciales.
export const DEFAULT_WAREHOUSE_PERMISSIONS = Object.freeze([
  "productos:read", "productos:write",
  "inventario:read", "inventario:write", "inventario:delete",
  "compras:read", "compras:write", "compras:receive",
  "solicitudes:read",
]);
