import { canReadProductCost } from "./permisos";
import { fotoComoUrl, galeriaComoUrls, huellaFoto } from "./imagenes";

export function toProducto(producto) {
  if (!producto) return null;
  return {
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    codigoBarras: producto.codigoBarras ?? "",
    categoria: producto.categoria,
    marca: producto.marca ?? "",
    unidad: producto.unidad,
    descripcion: producto.descripcion ?? "",
    precio: Number(producto.precio),
    precioDescuento: producto.precioDescuento == null ? null : Number(producto.precioDescuento),
    precioMayorista: producto.precioMayorista == null ? null : Number(producto.precioMayorista),
    preciosUpdatedAt: producto.preciosUpdatedAt ?? null,
    preciosUpdatedBy: producto.preciosUpdatedBy ?? null,
    costo: producto.costo == null ? null : Number(producto.costo),
    stock: producto.stock,
    stockMinimo: producto.stockMinimo,
    ubicacion: producto.ubicacion ?? "",
    garantia: producto.garantia ?? "",
    peso: producto.peso == null ? null : Number(producto.peso),
    estado: producto.estado,
    foto: producto.foto ?? "",
    fotos: producto.fotos ?? [],
    createdBy: producto.createdBy ?? null,
    updatedBy: producto.updatedBy ?? null,
    createdAt: producto.createdAt ?? null,
    updatedAt: producto.updatedAt ?? null,
  };
}

export function toCliente(cliente) {
  if (!cliente) return null;
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    rtn: cliente.rtn ?? "",
    contacto: cliente.contacto ?? "",
    correo: cliente.correo ?? "",
    telefono: cliente.telefono ?? "",
    direccion: cliente.direccion ?? "",
    ciudad: cliente.ciudad ?? "",
    estado: cliente.estado,
    foto: cliente.foto ?? "",
    fechaRegistro: toDateOnly(cliente.fechaRegistro),
  };
}

export function toSucursal(sucursal) {
  if (!sucursal) return null;
  return {
    id: sucursal.id,
    nombre: sucursal.nombre,
    codigo: sucursal.codigo,
    ciudad: sucursal.ciudad,
    direccion: sucursal.direccion ?? "",
    telefono: sucursal.telefono ?? "",
    email: sucursal.email ?? "",
    responsable: sucursal.responsable ?? "",
    estado: sucursal.estado,
  };
}

export function toTrabajador(trabajador, cuenta = null) {
  if (!trabajador) return null;
  return {
    id: trabajador.id,
    nombre: trabajador.nombre,
    puesto: trabajador.puesto ?? "",
    correo: trabajador.correo,
    telefono: trabajador.telefono ?? "",
    sucursal: trabajador.sucursalId ?? "",
    rol: trabajador.rol,
    estado: trabajador.estado,
    ingreso: toDateOnly(trabajador.ingreso),
    foto: trabajador.foto ?? "",
    accesoPanel: Boolean(cuenta),
    accesoActivo: cuenta ? cuenta.activo : false,
  };
}

// Listado de trabajadores: la foto se sirve por endpoint, no dentro del JSON.
export function toTrabajadorParaListado(trabajador, cuenta = null) {
  const result = toTrabajador(trabajador, cuenta);
  if (!result) return result;
  const huella = huellaFoto(trabajador.foto);
  return {
    ...result,
    foto: fotoComoUrl(trabajador.foto, `/api/trabajadores/${encodeURIComponent(result.id)}/foto${huella ? `?v=${huella}` : ""}`),
  };
}

export function toOrden(orden) {
  if (!orden) return null;
  return {
    id: orden.id,
    numero: orden.numero ?? null,
    tipo: orden.tipo,
    cliente: orden.cliente?.nombre ?? "",
    clienteId: orden.clienteId,
    fecha: toDateOnly(orden.fecha),
    fechaVencimiento: toDateOnly(orden.fechaVencimiento),
    updatedAt: orden.updatedAt ?? null,
    monto: Number(orden.monto),
    descuento: Number(orden.descuento ?? 0),
    estado: orden.estado,
    notas: orden.notas ?? "",
    items: (orden.items ?? []).map((item) => ({
      id: item.id,
      nivelPrecio: item.nivelPrecio ?? null,
      precioBase: item.precioBase == null ? null : Number(item.precioBase),
      productoId: item.productoId ?? "",
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      precio: Number(item.precio),
    })),
  };
}

function toDateOnly(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// DTO de tarifas: un gestor de precios no necesita costos, fotos ni existencias.
export function toPrecio(product) {
  return {
    id: product.id, nombre: product.nombre, sku: product.sku, categoria: product.categoria, estado: product.estado,
    precio: Number(product.precio),
    precioDescuento: product.precioDescuento == null ? null : Number(product.precioDescuento),
    precioMayorista: product.precioMayorista == null ? null : Number(product.precioMayorista),
    preciosUpdatedAt: product.preciosUpdatedAt ?? null, preciosUpdatedBy: product.preciosUpdatedBy ?? null,
  };
}

// El GET histórico del catálogo sigue disponible a la sesión autenticada;
// sólo se minimiza el dato financiero de quienes no lo tienen autorizado.
export function toProductoForRead(producto, permisos) {
  const result = toProducto(producto);
  if (result && !canReadProductCost(permisos)) delete result.costo;
  return result;
}

// Listado de productos: la imagen no viaja en el JSON.
//
// `foto` y `fotos` guardan un data URL de hasta 200 KB cada uno. Devolverlos
// en el listado hacía que /api/productos pesara 16.8 MB con solo 16 productos
// con imagen, y el panel lo pide al entrar: el navegador se quedaba cargando
// segundos sin que el usuario hubiera abierto Productos. Aquí se cambian por
// la ruta del endpoint que sirve los bytes, que el navegador solo pide cuando
// la miniatura se pinta y guarda en caché.
export function toProductoParaListado(producto, permisos) {
  const result = toProductoForRead(producto, permisos);
  if (!result) return result;
  const ruta = `/api/productos/${encodeURIComponent(result.id)}/foto`;
  const huella = huellaFoto(producto.foto) || huellaFoto(producto.fotos?.[0]);
  return {
    ...result,
    foto: fotoComoUrl(producto.foto, `${ruta}${huella ? `?v=${huella}` : ""}`),
    fotos: galeriaComoUrls(producto.fotos, ruta),
  };
}

// Ficha concreta (crear/editar): el data URL completo solo se necesita para la
// vista previa del editor, así que ahí sí se conserva la imagen.
export function toClienteParaListado(cliente) {
  const result = toCliente(cliente);
  if (!result) return result;
  const huella = huellaFoto(cliente.foto);
  return {
    ...result,
    foto: fotoComoUrl(cliente.foto, `/api/clientes/${encodeURIComponent(result.id)}/foto${huella ? `?v=${huella}` : ""}`),
  };
}
