import { describe, expect, it } from "vitest";
import { destinoDeNotificacion, NOTIFICATION_DESTINATIONS, seccionDeNotificacion } from "../lib/notificaciones-ui";

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

describe("etiqueta de la sección de cada notificación (lista completa)", () => {
  it("identifica la sección de cada tipo de aviso", () => {
    expect(seccionDeNotificacion({ type: "stock" })).toContain("Inventario");
    expect(seccionDeNotificacion({ type: "stock" })).toContain("Alertas de stock");
    expect(seccionDeNotificacion({ type: "producto" })).toContain("Productos");
    expect(seccionDeNotificacion({ type: "producto" })).toContain("Pendiente de precio");
    expect(seccionDeNotificacion({ type: "solicitud", solicitudId: "s1" })).toContain("Órdenes");
  });

  it("una notificación de tipo desconocido cae en Panel", () => {
    expect(seccionDeNotificacion({ type: "otro" })).toContain("Panel");
    expect(seccionDeNotificacion(null)).toContain("Panel");
  });
});
