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
