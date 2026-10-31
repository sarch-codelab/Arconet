import { canAccessSection, PERMISSION_MODULES } from "./permisos";

const SALES_ALIASES = new Set(["cotizaciones", "facturas", "facturacion"]);

export function normalizeAdminSection(value) {
  const section = typeof value === "string" ? value.trim() : "";
  return SALES_ALIASES.has(section) ? "ventas" : ["productos", "compras"].includes(section) ? "inventario" : section;
}

export function defaultAdminSection(permisos, preferred) {
  const section = normalizeAdminSection(preferred);
  if (canAccessSection(permisos, section)) return section;
  if (canAccessSection(permisos, "resumen")) return "resumen";
  return PERMISSION_MODULES.find(module => canAccessSection(permisos, module.section))?.section || "mi-perfil";
}

// La query actual manda sobre un #trabajadores de la navegación antigua.
// El hash solo se admite al abrir un enlace legado sin query de sección.
export function resolveAdminSection(href, permisos, fallback) {
  const url = new URL(href);
  const candidate = normalizeAdminSection(url.searchParams.has("section")
    ? url.searchParams.get("section") : url.hash.slice(1));
  return canAccessSection(permisos, candidate) ? candidate : defaultAdminSection(permisos, fallback);
}

export function adminSectionUrl(href, section) {
  const url = new URL(href);
  const target = normalizeAdminSection(section);
  const legacy = [section, url.searchParams.get("section"), ...(!url.searchParams.has("section") ? [url.hash.slice(1)] : [])].find(value => ["productos", "compras"].includes(value));
  if (target === "inventario" && legacy) url.searchParams.set("view", legacy);
  if (target !== "inventario") url.searchParams.delete("view");
  url.searchParams.set("section", target);
  url.hash = "";
  return url.href;
}

// La selección externa «Facturas» no debe sobreescribir cada selección interna.
// También se aceptan ids internos cuando el panel se usa sin VentasSection.
const FISCAL_TABS = new Set(["documentos", "nueva", "libro", "config"]);
export function resolveFiscalTab(controlledTab, innerTab = "documentos") {
  if (FISCAL_TABS.has(controlledTab)) return controlledTab;
  return FISCAL_TABS.has(innerTab) ? innerTab : "documentos";
}

// Ventas comercial y facturación comparten sección, no autorización.
export function allowedSalesTabs(tabs, permisos = []) {
  const permissions = Array.isArray(permisos) ? permisos : [];
  return tabs.filter(tab => permissions.includes(tab.id === "precios" ? "precios:read" : tab.id === "facturas" ? "facturacion:read" : "ordenes:read"));
}

// Crear y consultar son permisos distintos. La entrada unificada nunca
// concede emisión fiscal por el solo hecho de poder crear ventas comerciales.
export function allowedSalesCreationModes(permisos = []) {
  const has = permission => Array.isArray(permisos) && permisos.includes(permission);
  return [
    ...(has("ordenes:read") && has("ordenes:write") ? ["comercial"] : []),
    ...(has("facturacion:read") && has("facturacion:write") ? ["fiscal"] : []),
  ];
}

// Consultar el catálogo de apoyo de inventario no habilita el módulo Productos.
// No se puede depender de ProductoStock: un SKU nuevo todavía no tiene saldo.
export function canLookupInventoryProducts(permisos = []) {
  return Array.isArray(permisos) && permisos.some(permission =>
    permission === "productos:read" || permission === "inventario:read");
}

export const INVENTORY_VIEWS = ["productos", "stock", "compras", "cotizaciones", "recepciones", "proveedores", "kardex", "movimientos", "bodegas", "alertas"];
export function allowedInventoryViews(permisos = []) {
  const has = permission => Array.isArray(permisos) && permisos.includes(permission);
  return INVENTORY_VIEWS.filter(view => view === "productos" ? has("productos:read")
    : ["compras", "cotizaciones", "proveedores"].includes(view) ? has("compras:read")
    : view === "recepciones" ? has("inventario:read") && has("compras:receive")
    : has("inventario:read"));
}
export function resolveInventoryView(permisos, requested) {
  const views = allowedInventoryViews(permisos);
  return views.includes(requested) ? requested : views.includes("stock") ? "stock" : views[0] || "";
}
