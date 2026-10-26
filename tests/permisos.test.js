import { describe, it, expect } from "vitest";
import {
  canAccessSection,
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
