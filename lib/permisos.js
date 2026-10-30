// Catálogo de permisos del panel administrativo.
// Lo usan el servidor (para autorizar las APIs) y el cliente (para decidir qué
// secciones y acciones mostrar), así que no debe importar nada de servidor.

/** Rol que siempre tiene acceso total; evita quedar bloqueado fuera del panel. */
export const SUPER_ROLE = "administrador";

export const PERMISSION_ACTIONS = [
  { id: "read", label: "Ver" },
  { id: "write", label: "Crear y editar" },
  { id: "delete", label: "Eliminar" },
  { id: "receive", label: "Recibir mercadería" },
];

/**
 * Cada módulo controla una sección del panel. `read` hace visible la sección;
 * `write` y `delete` habilitan las acciones correspondientes en su API.
 */
export const PERMISSION_MODULES = [
  { id: "trabajadores", section: "trabajadores", label: "Trabajadores", actions: ["read", "write", "delete"] },
  { id: "roles", section: "roles", label: "Roles y permisos", actions: ["read", "write", "delete"] },
  { id: "productos", section: "inventario", label: "Productos", actions: ["read", "write", "delete"] },
  { id: "categorias", section: "categorias", label: "Categorías", actions: ["read", "write", "delete"] },
  { id: "sucursales", section: "sucursales", label: "Sucursales", actions: ["read", "write", "delete"] },
  { id: "clientes", section: "clientes", label: "Clientes", actions: ["read", "write", "delete"] },
  // Ventas agrupa ahora cotizaciones, ventas y facturación fiscal en una sola
  // seccion del panel; el id de permiso sigue siendo `ordenes` para no romper
  // roles ya guardados en la base de datos.
  { id: "ordenes", section: "ventas", label: "Ventas (cotizaciones y facturación)", actions: ["read", "write", "delete"] },
  // Comparte la pantalla de Ventas, pero sus APIs conservan permisos fiscales
  // propios: no conceder emisión de facturas a todos los vendedores.
  { id: "precios", section: "ventas", label: "Precios y descuentos", actions: ["read", "write"] },
  { id: "facturacion", section: "ventas", label: "Facturación fiscal", actions: ["read", "write"] },
  { id: "inventario", section: "inventario", label: "Inventario y kardex", actions: ["read", "write", "delete"] },
  { id: "compras", section: "inventario", label: "Compras y proveedores", actions: ["read", "write", "delete", "receive"] },
  { id: "solicitudes", section: "solicitudes", label: "Órdenes internas", actions: ["read", "write"] },
  { id: "monitoreo", section: "monitoreo", label: "Monitoreo", actions: ["read"] },
  { id: "logs", section: "logs", label: "Logs globales", actions: ["read", "delete"] },
  { id: "reportes", section: "resumen", label: "Resumen y reportes globales", actions: ["read"] },
  { id: "ajustes", section: "ajustes", label: "Ajustes", actions: ["read", "write"] },
];

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((mod) =>
  mod.actions.map((action) => `${mod.id}:${action}`),
);

/** Secciones a las que cualquier usuario autenticado puede entrar. */
const ALWAYS_VISIBLE_SECTIONS = new Set(["mi-perfil"]);

/**
 * Alias históricos de secciones. Al unificar "Cotizaciones" y "Facturación"
 * en una sola sección "Ventas", muchos enlaces y roles antiguos siguen
 * apuntando a los ids viejos (`cotizaciones`, `facturas`, `ordenes`).
 * Aquí se resuelven hacia la sección real para no romper accesos.
 */
const SECTION_ALIASES = {
  cotizaciones: "ventas",
  facturas: "ventas",
  facturacion: "ventas",
  productos: "inventario",
  compras: "inventario",
};

export function canAccessSection(permisos, section) {
  if (ALWAYS_VISIBLE_SECTIONS.has(section)) return true;
  if (["resumen", "logs"].includes(section) && permisos?.includes("inventario:read")) return true;
  const resolved = SECTION_ALIASES[section] || section;
  // Solo se resuelve por `section` explícita: el id del módulo (p. ej.
  // "ordenes") no es una sección navegable, así que debe seguir devolviendo
  // false para mantener la semántica estricta de permisos.
  return PERMISSION_MODULES.some((mod) =>
    mod.section === resolved && permisos?.includes(`${mod.id}:read`),
  );
}

/** Deja solo permisos conocidos, sin duplicados y en el orden del catálogo. */
export function normalizePermisos(permisos) {
  if (!Array.isArray(permisos)) return [];
  const wanted = new Set(permisos);
  return ALL_PERMISSIONS.filter((permiso) => wanted.has(permiso));
}
