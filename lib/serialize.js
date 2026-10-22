export function toProducto(producto) {
  if (!producto) return null;
  return {
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    categoria: producto.categoria,
    marca: producto.marca ?? "",
    unidad: producto.unidad,
    descripcion: producto.descripcion ?? "",
    precio: Number(producto.precio),
    costo: producto.costo == null ? null : Number(producto.costo),
    stock: producto.stock,
    stockMinimo: producto.stockMinimo,
    ubicacion: producto.ubicacion ?? "",
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

export function toOrden(orden) {
  if (!orden) return null;
  return {
    id: orden.id,
    tipo: orden.tipo,
    cliente: orden.cliente?.nombre ?? "",
    clienteId: orden.clienteId,
    fecha: toDateOnly(orden.fecha),
    monto: Number(orden.monto),
    estado: orden.estado,
    notas: orden.notas ?? "",
    items: (orden.items ?? []).map((item) => ({
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
