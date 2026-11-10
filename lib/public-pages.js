// Solo rutas públicas de contenido. Inicio, accesos, portal, panel y APIs se
// mantienen disponibles: son necesarios para navegar y recuperar el control.
export const PUBLIC_PAGES = [
  { id: "catalogo", name: "Catálogo", path: "/catalogo", description: "Vitrina, destacados y fichas editoriales.", nested: true },
  { id: "tienda", name: "Tienda", path: "/tienda", description: "Tienda, categorías y fichas de productos.", nested: true },
  { id: "contacto", name: "Contacto", path: "/contacto", description: "Formulario y datos de contacto." },
  { id: "ayuda", name: "Ayuda", path: "/ayuda", description: "Preguntas frecuentes y ayuda." },
  { id: "garantias", name: "Garantías", path: "/garantias", description: "Garantías y devoluciones." },
  { id: "terminos", name: "Términos de uso", path: "/terminos", description: "Condiciones de uso del sitio." },
  { id: "privacidad", name: "Privacidad", path: "/privacidad", description: "Aviso de privacidad." },
  { id: "cookies", name: "Cookies", path: "/cookies", description: "Política de cookies." },
  { id: "aviso-legal", name: "Aviso legal", path: "/aviso-legal", description: "Información legal del sitio." },
];

export const PUBLIC_PAGE_PREFIX = "pagina.publica.";
export const publicPageKey = (id) => `${PUBLIC_PAGE_PREFIX}${id}`;
export const publicPageDefaults = () => Object.fromEntries(PUBLIC_PAGES.map(({ id }) => [id, true]));

export function publicPagesFromRows(rows) {
  const result = publicPageDefaults();
  for (const { clave, valor } of rows) {
    const id = clave.startsWith(PUBLIC_PAGE_PREFIX) ? clave.slice(PUBLIC_PAGE_PREFIX.length) : "";
    if (Object.hasOwn(result, id) && (valor === "true" || valor === "false")) result[id] = valor === "true";
  }
  return result;
}

export function publicPageForPath(pathname) {
  // Recursos conocidos de public/catalogo, sin excluir rutas de fichas cuyo
  // identificador pueda contener puntos. /tienda no contiene assets públicos.
  if (/^\/catalogo\/(?:lineas\/)?[^/]+\.(?:jpe?g|png|webp|avif|svg)$/i.test(pathname)
    || /^\/catalogo\/lineas\/cards\/[^/]+\.(?:jpe?g|png|webp|avif|svg)$/i.test(pathname)) return null;
  return PUBLIC_PAGES.find(({ path, nested }) => pathname === path || pathname === `${path}/` || (nested && pathname.startsWith(`${path}/`))) || null;
}
