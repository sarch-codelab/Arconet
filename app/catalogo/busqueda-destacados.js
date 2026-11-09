// Búsqueda sobre la lista recibida: incluye los productos editoriales y,
// cuando está disponible, el inventario cargado desde la tienda.
export const normalizarBusqueda = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function coincideBusqueda(producto, consulta) {
  const texto = normalizarBusqueda(consulta);
  return !texto || normalizarBusqueda(`${producto.name} ${producto.line}`).includes(texto);
}

export function sugerirDestacados(productos, consulta) {
  return normalizarBusqueda(consulta) ? productos.filter((producto) => coincideBusqueda(producto, consulta)) : [];
}
