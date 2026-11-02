/** Pantalla de destino por tipo de notificación. */
export const NOTIFICATION_DESTINATIONS = {
  stock: { section: "inventario", view: "alertas" },
  producto: { section: "inventario", view: "productos" },
};

/**
 * La notificación lleva a su pantalla: las solicitudes a la bandeja, los
 * avisos de agotamiento a las alertas de inventario y los productos
 * pendientes de precio al catálogo. Sin destino conocido, null.
 */
export function destinoDeNotificacion(notification) {
  if (!notification) return null;
  if (notification.solicitudId) return { section: "solicitudes" };
  return NOTIFICATION_DESTINATIONS[notification.type] || null;
}

/** Etiqueta de la sección origen de cada notificación (lista completa). */
export const NOTIFICATION_SECTIONS = {
  stock: { label: "Inventario", hint: "Alertas de stock" },
  producto: { label: "Productos", hint: "Pendiente de precio" },
  solicitud: { label: "Órdenes", hint: "Solicitud interna" },
};

export function seccionDeNotificacion(notification) {
  const section = NOTIFICATION_SECTIONS[notification?.type] || { label: "Panel", hint: "Aviso" };
  return section.label === "Panel" ? "Panel · Aviso" : `${section.label} · ${section.hint}`;
}
