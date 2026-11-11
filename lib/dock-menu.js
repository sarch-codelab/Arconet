import { NAVIGATION } from "../app/navigation-data";

export const DOCK_MENU_KEY = "menu.navegacion2";
export const HERO_MENU_KEY = "menu.navegacion1";
export const UNIFIED_MENU_KEY = "menu.navegacion.unificado";
export const MENU_LIMITS = Object.freeze({ items: 21, groups: 16, links: 40, legal: 20 });

export function defaultDockMenu() {
  return {
    version: 2,
    items: NAVIGATION.map((item, i) => ({
      id: item.id || `enlace-${i}`, label: item.label, href: item.href, enabled: true,
      groups: (item.megaGroups || []).map((group, j) => ({
        id: `grupo-${i}-${j}`, title: group.title, enabled: true,
        links: group.links.map((link, k) => ({ id: `sub-${i}-${j}-${k}`, ...link, enabled: true })),
      })),
    })),
    primary: { label: "Tienda", description: "Explora todos los productos", href: "/tienda", enabled: true, linked: true },
    legal: [
      { id: "terminos", label: "Términos", href: "/terminos", enabled: true },
      { id: "privacidad", label: "Privacidad", href: "/privacidad", enabled: true },
      { id: "ayuda", label: "Ayuda", href: "/ayuda", enabled: true },
    ],
  };
}

export function validMenuHref(value) {
  if (typeof value !== "string" || value.length > 300 || !value || value !== value.trim() || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("#")) return /^#[A-Za-z0-9_-]+$/.test(value);
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export function validateDockMenu(menu) {
  if (!menu || typeof menu !== "object" || Array.isArray(menu)) throw new Error("El menú no es válido.");
  const seen = new Set();
  const id = (v) => {
    if (typeof v !== "string" || !/^[a-zA-Z0-9_-]{1,70}$/.test(v) || seen.has(v)) throw new Error("Hay identificadores de menú inválidos o repetidos.");
    seen.add(v); return v;
  };
  const text = (v, label, max = 80) => {
    if (typeof v !== "string" || !v.trim() || v.trim().length > max || /[\u0000-\u001f\u007f]/.test(v)) throw new Error(`${label} debe tener entre 1 y ${max} caracteres.`);
    return v.trim();
  };
  const enabled = (v) => { if (typeof v !== "boolean") throw new Error("Estado de visibilidad inválido."); return v; };
  const href = (v) => { if (!validMenuHref(v)) throw new Error("Usa enlaces internos que comiencen con / o #, o direcciones https válidas."); return v; };
  const list = (v, max, label) => { if (!Array.isArray(v) || v.length > max) throw new Error(`Demasiados elementos en ${label}.`); return v; };
  const link = (item) => ({ id: id(item?.id), label: text(item?.label, "El nombre"), href: href(item?.href), enabled: enabled(item?.enabled) });
  const primary = menu.primary;
  return {
    version: menu.version === 2 ? 2 : 1,
    items: list(menu.items, MENU_LIMITS.items, "la barra").map((item) => ({ ...link(item), groups: list(item.groups, MENU_LIMITS.groups, "los grupos").map((group) => ({
      id: id(group?.id), title: text(group?.title, "El título del grupo"), enabled: enabled(group?.enabled),
      links: list(group?.links, MENU_LIMITS.links, "los enlaces de grupo").map(link),
    })) })),
    primary: { label: text(primary?.label, "El nombre del acceso destacado"), description: text(primary?.description, "La descripción", 120), href: href(primary?.href), enabled: enabled(primary?.enabled), linked: typeof primary?.linked === "boolean" ? primary.linked : primary?.label === "Tienda" && primary?.href === "/tienda" },
    legal: list(menu.legal, MENU_LIMITS.legal, "los enlaces inferiores").map(link),
  };
}

// Las versiones anteriores guardaron los destinos originales de las líneas como
// /tienda/<slug>, que muestran una ficha antigua, no los productos de la
// categoría. Solo se corrigen entradas originales con ID y destino intactos;
// los enlaces añadidos o editados se conservan. Al guardar se marca versión 2,
// para que una elección posterior del enlace antiguo no se cambie de nuevo.
export function upgradeLegacyMenu(menu) {
  if (menu.version === 2) return menu;
  const originals = new Map();
  const defaults = defaultDockMenu();
  for (const item of defaults.items) for (const group of item.groups) for (const link of group.links) {
    if (link.href.startsWith("/tienda/categoria/")) {
      originals.set(link.id, { old: link.href.replace("/tienda/categoria/", "/tienda/"), current: link.href });
    }
  }
  return {
    ...menu,
    version: 2,
    items: menu.items.map((item) => ({ ...item, groups: item.groups.map((group) => ({ ...group,
      links: group.links.map((link) => {
        const match = originals.get(link.id);
        return match && link.href === match.old ? { ...link, href: match.current } : link;
      }),
    })) })),
  };
}

export function visibleDockMenu(menu, forStore = false) {
  const convert = (href) => forStore && href.startsWith("#") ? `/${href}` : href;
  const linkedItem = menu.items.find((item) => item.id === "enlace-2");
  const primary = menu.primary.linked
    ? { ...menu.primary, label: linkedItem?.label || menu.primary.label, href: linkedItem?.href || menu.primary.href, enabled: menu.primary.enabled && Boolean(linkedItem?.enabled) }
    : menu.primary;
  return {
    primary: { ...primary, href: convert(primary.href) },
    legal: menu.legal.filter((entry) => entry.enabled).map((entry) => ({ ...entry, href: convert(entry.href) })),
    items: menu.items.filter((item) => item.enabled).map((item) => {
      const megaGroups = item.groups.filter((group) => group.enabled).map((group) => ({
        id: group.id, title: group.title, links: group.links.filter((entry) => entry.enabled).map((entry) => ({ ...entry, href: convert(entry.href) })),
      })).filter((group) => group.links.length);
      const sectionId = /^#[A-Za-z0-9_-]+$/.test(item.href) ? item.href.slice(1) : item.id;
      return { id: sectionId, keyId: item.id, label: item.label, href: convert(item.href), mega: megaGroups.length > 0, megaGroups };
    }),
  };
}
