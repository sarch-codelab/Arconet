import { normalizarBusqueda } from "./busqueda-destacados";

export const ELEMENTOS_POR_PAGINA = 6;

export function paginaDe(elementos, pagina) {
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / ELEMENTOS_POR_PAGINA));
  const actual = Math.max(0, Math.min(Number.isFinite(pagina) ? Math.floor(pagina) : 0, totalPaginas - 1));
  return {
    actual,
    totalPaginas,
    elementos: elementos.slice(actual * ELEMENTOS_POR_PAGINA, (actual + 1) * ELEMENTOS_POR_PAGINA),
  };
}

const CATEGORIAS = {
  "soluciones de preconectorizado": "fibra",
  "componentes pasivos": "pasivos",
  "instrumentos de medicion optica": "medicion",
  "gabinetes y racks": "gabinetes",
  "herramientas y kits": "herramientas",
};

// Se muestran únicamente productos activos y con existencias devueltos por la
// API pública de la tienda, sin copiar precios ni inventar fichas editoriales.
export function productosDeTienda(productos) {
  if (!Array.isArray(productos)) return [];
  return productos.filter((item) => item && typeof item.id === "string" && item.id.trim()
    && typeof item.nombre === "string" && item.nombre.trim() && Number.isFinite(Number(item.stock)) && Number(item.stock) > 0)
    .map((item) => ({
      id: item.id,
      origen: "tienda",
      name: item.nombre,
      line: typeof item.categoria === "string" ? item.categoria : "Productos de tienda",
      category: CATEGORIAS[normalizarBusqueda(typeof item.categoria === "string" ? item.categoria : "")] || "otras",
      image: typeof item.foto === "string" && (/^\/(?!\/)/.test(item.foto) || /^https:\/\//i.test(item.foto)) ? item.foto : "/catalogo/hero-fiber.jpg",
      href: `/tienda/producto/${encodeURIComponent(item.id)}`,
      offer: false,
    }));
}

// Solo se añaden nombres que aparecen en productos con existencias; no se
// inventan logotipos ni se afirma una condición de distribuidor autorizado.
export function marcasDeTienda(productos, marcasExistentes) {
  if (!Array.isArray(productos)) return [];
  const conocidas = new Set(marcasExistentes.map((marca) => normalizarBusqueda(marca.name)));
  conocidas.add("arconet");
  const resultado = [];
  for (const item of productos) {
    if (!item || typeof item.id !== "string" || !item.id.trim() || Number(item.stock) <= 0 || !Number.isFinite(Number(item.stock)) || typeof item.marca !== "string") continue;
    const nombre = item.marca.trim();
    const clave = normalizarBusqueda(nombre);
    if (!clave || conocidas.has(clave)) continue;
    conocidas.add(clave);
    resultado.push({ name: nombre, logo: "", href: `/tienda/producto/${encodeURIComponent(item.id)}` });
  }
  return resultado;
}
