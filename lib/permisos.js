// Catálogo de permisos del panel administrativo.
// Lo usan el servidor (para autorizar las APIs) y el cliente (para decidir qué
// secciones y acciones mostrar), así que no debe importar nada de servidor.

/** Rol que siempre tiene acceso total; evita quedar bloqueado fuera del panel. */
export const SUPER_ROLE = "administrador";

export const PERMISSION_ACTIONS = [
  { id: "read", label: "Ver" },
  { id: "write", label: "Crear y editar" },
  { id: "delete", label: "Eliminar" },
];

/**
 * Cada módulo controla una sección del panel. `read` hace visible la sección;
 * `write` y `delete` habilitan las acciones correspondientes en su API.
 */
export const PERMISSION_MODULES = [
  { id: "trabajadores", section: "trabajadores", label: "Trabajadores", actions: ["read", "write", "delete"] },
  { id: "roles", section: "roles", label: "Roles y permisos", actions: ["read", "write", "delete"] },
  { id: "productos", section: "productos", label: "Productos", actions: ["read", "write", "delete"] },
  { id: "categorias", section: "categorias", label: "Categorías", actions: ["read", "write", "delete"] },
  { id: "sucursales", section: "sucursales", label: "Sucursales", actions: ["read", "write", "delete"] },
  { id: "clientes", section: "clientes", label: "Clientes", actions: ["read", "write", "delete"] },
  { id: "ordenes", section: "cotizaciones", label: "Cotizaciones", actions: ["read", "write", "delete"] },
  { id: "inventario", section: "inventario", label: "Inventario y kardex", actions: ["read", "write", "delete"] },
  { id: "compras", section: "compras", label: "Compras y proveedores", actions: ["read", "write", "delete"] },
  { id: "facturacion", section: "facturacion", label: "Facturación", actions: ["read", "write", "delete"] },
  { id: "solicitudes", section: "solicitudes", label: "Órdenes internas", actions: ["read", "write"] },
  { id: "monitoreo", section: "monitoreo", label: "Monitoreo", actions: ["read"] },
  { id: "logs", section: "logs", label: "Logs", actions: ["read", "delete"] },
  { id: "reportes", section: "resumen", label: "Resumen", actions: ["read"] },
  { id: "ajustes", section: "ajustes", label: "Ajustes", actions: ["read", "write"] },
];

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((mod) =>
  mod.actions.map((action) => `${mod.id}:${action}`),
);

/** Secciones a las que cualquier usuario autenticado puede entrar. */
const ALWAYS_VISIBLE_SECTIONS = new Set(["mi-perfil"]);

export function canAccessSection(permisos, section) {
  if (ALWAYS_VISIBLE_SECTIONS.has(section)) return true;
  const mod = PERMISSION_MODULES.find((item) => item.section === section);
  return Boolean(mod && permisos?.includes(`${mod.id}:read`));
}

/** Deja solo permisos conocidos, sin duplicados y en el orden del catálogo. */
export function normalizePermisos(permisos) {
  if (!Array.isArray(permisos)) return [];
  const wanted = new Set(permisos);
  return ALL_PERMISSIONS.filter((permiso) => wanted.has(permiso));
}
