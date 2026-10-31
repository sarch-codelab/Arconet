import { describe, it, expect } from "vitest";
import {
  canAccessSection,
  canEmitFiscalSale,
  normalizePermisos,
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
} from "../lib/permisos";

describe("canAccessSection", () => {
  it("permite mi-perfil a cualquier usuario autenticado", () => {
    expect(canAccessSection([], "mi-perfil")).toBe(true);
    expect(canAccessSection(undefined, "mi-perfil")).toBe(true);
  });

  it("exige el permiso read del modulo correspondiente", () => {
    expect(canAccessSection(["productos:read"], "productos")).toBe(true);
    expect(canAccessSection(["productos:write"], "productos")).toBe(false);
    expect(canAccessSection([], "productos")).toBe(false);
  });

  it("resuelve el mapeo ordenes -> seccion cotizaciones", () => {
    // El modulo "ordenes" controla la seccion "cotizaciones"
    expect(canAccessSection(["ordenes:read"], "cotizaciones")).toBe(true);
    expect(canAccessSection(["ordenes:read"], "ordenes")).toBe(false);
  });

  it("incluye los permisos fiscales usados por las APIs", () => {
    expect(ALL_PERMISSIONS).toContain("facturacion:read");
    expect(ALL_PERMISSIONS).toContain("facturacion:write");
    expect(normalizePermisos(["facturacion:read"])).toEqual(["facturacion:read"]);
  });

  it("permite la pantalla compartida al rol fiscal sin concederle ventas", () => {
    expect(canAccessSection(["facturacion:read"], "ventas")).toBe(true);
    expect(canAccessSection(["facturacion:read"], "facturas")).toBe(true);
    expect(canAccessSection(["facturacion:write"], "ventas")).toBe(false);
  });

  it("desconoce secciones inexistentes", () => {
    expect(canAccessSection(ALL_PERMISSIONS, "seccion-fantasma")).toBe(false);
  });
});

describe("normalizePermisos", () => {
  it("elimina duplicados y conserva el orden del catalogo", () => {
    const salida = normalizePermisos(["productos:write", "productos:read", "productos:write"]);
    expect(salida).toEqual(["productos:read", "productos:write"]);
  });

  it("descarta permisos que no existen en el catalogo", () => {
    const salida = normalizePermisos(["hacker:delete", "productos:read"]);
    expect(salida).toEqual(["productos:read"]);
  });

  it("tolera entradas no array", () => {
    expect(normalizePermisos(null)).toEqual([]);
    expect(normalizePermisos("productos:read")).toEqual([]);
  });

  it("el catalogo cubre todos los modulos declarados", () => {
    for (const mod of PERMISSION_MODULES) {
      for (const accion of mod.actions) {
        expect(ALL_PERMISSIONS).toContain(`${mod.id}:${accion}`);
      }
    }
  });
});


describe("permiso independiente de emisión operativa", () => {
  it("normaliza el permiso nuevo sin convertirlo en administración fiscal", () => {
    expect(normalizePermisos(["facturacion:emit", "facturacion:read", "facturacion:emit"]))
      .toEqual(["facturacion:read", "facturacion:emit"]);
    expect(ALL_PERMISSIONS).toContain("facturacion:emit");
  });
  it.each([null, undefined, [], ["facturacion:read"], ["facturacion:emit"], ["facturacion:write"], ["ordenes:read", "ordenes:write"]].map(permisos => [permisos]))("no infiere permiso fiscal para %j", permisos => {
    expect(canEmitFiscalSale(permisos)).toBe(false);
  });
  it.each([["facturacion:read", "facturacion:emit"], ["facturacion:read", "facturacion:write"], ALL_PERMISSIONS].map(permisos => [permisos]))("autoriza emisión operativa o gestión fiscal explícitas: %j", permisos => {
    expect(canEmitFiscalSale(permisos)).toBe(true);
  });
});
