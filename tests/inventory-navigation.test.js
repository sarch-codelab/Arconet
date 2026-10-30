import { describe, it, expect } from "vitest";
import { NAV } from "../app/admin/admin-nav";
import { ALL_PERMISSIONS, canAccessSection } from "../lib/permisos";
import {
  normalizeAdminSection,
  adminSectionUrl,
  defaultAdminSection,
  resolveAdminSection,
  allowedInventoryViews,
  resolveInventoryView,
} from "../lib/admin-navigation";
import { inventoryLogScope } from "../lib/inventory-access";
import { resolvePanelTheme } from "../lib/panel-theme";
const base = "https://arconet.test/panel-administrativo";
describe("Productos y compras dentro de Inventario", () => {
  it("hay una sola entrada principal, sin duplicar Productos ni Compras", () => {
    expect(NAV.some((item) => item.id === "productos")).toBe(false);
    expect(NAV.some((item) => item.id === "compras")).toBe(false);
    expect(NAV.filter((item) => item.id === "inventario")).toHaveLength(1);
  });
  it.each(["productos", "compras"])(
    "el enlace legado %s conserva su vista al canonicalizar",
    (alias) => {
      expect(normalizeAdminSection(alias)).toBe("inventario");
      expect(adminSectionUrl(`${base}?section=${alias}`, "inventario")).toBe(
        `${base}?section=inventario&view=${alias}`,
      );
      expect(
        resolveAdminSection(`${base}?section=${alias}`, ALL_PERMISSIONS),
      ).toBe("inventario");
    },
  );
  it.each(["productos", "compras"])(
    "el hash legado %s también conserva su vista interna",
    (alias) =>
      expect(adminSectionUrl(`${base}#${alias}`, "inventario")).toBe(
        `${base}?view=${alias}&section=inventario`,
      ),
  );
  it("navegar a Productos desde otra sección fija la vista interna", () =>
    expect(adminSectionUrl(`${base}?section=ventas`, "productos")).toBe(
      `${base}?section=inventario&view=productos`,
    ));
  it("salir de inventario no conserva una vista ajena en Ventas", () =>
    expect(
      adminSectionUrl(`${base}?section=inventario&view=compras`, "ventas"),
    ).toBe(`${base}?section=ventas`));
  it("un rol sólo de productos no pide stock, compras ni ventas", () => {
    const perms = ["productos:read"];
    expect(canAccessSection(perms, "inventario")).toBe(true);
    expect(defaultAdminSection(perms)).toBe("inventario");
    expect(allowedInventoryViews(perms)).toEqual(["productos"]);
    expect(resolveInventoryView(perms, "stock")).toBe("productos");
  });
  it("un comprador no obtiene movimientos o recepción con sólo compras:read", () => {
    expect(allowedInventoryViews(["compras:read"])).toEqual([
      "compras",
      "cotizaciones",
      "proveedores",
    ]);
  });
  it("un receptor no necesita precios o CRUD financiero para ver sus entregas", () => {
    const perms = ["inventario:read", "inventario:write", "compras:receive"];
    expect(allowedInventoryViews(perms)).toContain("recepciones");
    expect(allowedInventoryViews(perms)).not.toContain("compras");
    expect(allowedInventoryViews(perms)).not.toContain("productos");
    expect(canAccessSection(perms, "ventas")).toBe(false);
  });
  it("Bodega tiene su resumen y registros sin reportes/logs globales ni ventas", () => {
    const perms = [
      "inventario:read",
      "inventario:write",
      "productos:read",
      "compras:read",
      "compras:receive",
    ];
    expect(defaultAdminSection(perms)).toBe("resumen");
    expect(canAccessSection(perms, "resumen")).toBe(true);
    expect(canAccessSection(perms, "logs")).toBe(true);
    expect(canAccessSection(perms, "ventas")).toBe(false);
  });
  it("sólo escribir no concede lectura de vistas", () => {
    expect(
      allowedInventoryViews([
        "inventario:write",
        "productos:write",
        "compras:write",
      ]),
    ).toEqual([]);
  });
  it("nunca mezcla cotizaciones a proveedores con las de venta", () => {
    expect(normalizeAdminSection("cotizaciones")).toBe("ventas");
    expect(allowedInventoryViews(["inventario:read"])).not.toContain(
      "cotizaciones",
    );
    expect(allowedInventoryViews(["ordenes:read"])).toEqual([]);
  });
  it("todos los permisos de administración ven diez vistas sin perder las originales", () => {
    expect(allowedInventoryViews(ALL_PERMISSIONS)).toHaveLength(10);
    expect(resolveInventoryView(ALL_PERMISSIONS)).toBe("stock");
  });
  it("el alcance de logs no contiene autenticación, ventas o facturación", () => {
    const scope = JSON.stringify(
      inventoryLogScope(["inventario:read", "productos:read", "compras:read"]),
    );
    expect(scope).toContain("/api/inventario/");
    for (const path of [
      "/api/auth",
      "/api/facturacion",
      '"startsWith":"/api/ordenes"',
    ])
      expect(scope).not.toContain(path);
  });
});
describe("apariencia personal según dispositivo, no según otra cuenta", () => {
  it.each([
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    ["system", false, "light"],
  ])("%s con preferencia oscura %s → %s", (mode, prefersDark, expected) =>
    expect(resolvePanelTheme(mode, prefersDark)).toBe(expected),
  );
});
