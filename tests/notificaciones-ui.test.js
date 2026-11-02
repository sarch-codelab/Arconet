import { describe, expect, it } from "vitest";
import { destinoDeNotificacion, NOTIFICATION_DESTINATIONS } from "../lib/notificaciones-ui";

describe("destino de las notificaciones al hacer clic", () => {
  it("los avisos de stock llevan a las alertas de inventario", () => {
    expect(destinoDeNotificacion({ type: "stock" })).toEqual({ section: "inventario", view: "alertas" });
  });

  it("los productos pendientes de precio llevan al catálogo", () => {
    expect(destinoDeNotificacion({ type: "producto" })).toEqual({ section: "inventario", view: "productos" });
  });

  it("las solicitudes con id llevan a la bandeja de órdenes", () => {
    expect(destinoDeNotificacion({ type: "solicitud", solicitudId: "sol-1" })).toEqual({ section: "solicitudes" });
  });

  it("una notificación sin destino conocido no navega", () => {
    expect(destinoDeNotificacion({ type: "otro" })).toBeNull();
    expect(destinoDeNotificacion(undefined)).toBeNull();
    expect(destinoDeNotificacion(null)).toBeNull();
  });
});
