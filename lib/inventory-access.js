// Consultas del área: no se decide el alcance con filtros enviados por el cliente.
export function inventoryLogScope(permisos = []) {
  const OR = [
    { ruta: { startsWith: "/api/inventario/" } },
    { ruta: { startsWith: "/api/bodegas" } },
    {
      AND: [
        { ruta: { startsWith: "/api/ordenes-compra/" } },
        { ruta: { endsWith: "/recepcion" } },
      ],
    },
  ];
  if (permisos.includes("productos:read"))
    OR.push({ ruta: { startsWith: "/api/productos" } });
  if (permisos.includes("compras:read"))
    OR.push(
      { ruta: { startsWith: "/api/ordenes-compra" } },
      { ruta: { startsWith: "/api/proveedores" } },
    );
  return { OR };
}
