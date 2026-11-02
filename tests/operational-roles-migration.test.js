import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allowedInventoryViews,
  allowedSalesCreationModes,
} from "../lib/admin-navigation";
import { canAccessSection, canEmitFiscalSale } from "../lib/permisos";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_SALES_PERMISSIONS,
  DEFAULT_WAREHOUSE_PERMISSIONS,
} from "../lib/roles-defaults";

const migration = readFileSync(
  "prisma/migrations/20261102210000_roles_operativos_gerente_bodega/migration.sql",
  "utf8",
);
const managerMigration = migration.split(";").find(part => part.includes('"slug" = \'gerente\''));
const warehouseMigration = migration.split(";").find(part => part.includes('"slug" = \'bodega\''));

describe("contrato de los roles que entran a operación", () => {
  it("gerente puede crear una venta fiscal y operar inventario", () => {
    expect(canEmitFiscalSale(DEFAULT_MANAGER_PERMISSIONS)).toBe(true);
    expect(allowedSalesCreationModes(DEFAULT_MANAGER_PERMISSIONS)).toEqual(["fiscal"]);
    expect(canAccessSection(DEFAULT_MANAGER_PERMISSIONS, "ventas")).toBe(true);
    expect(allowedInventoryViews(DEFAULT_MANAGER_PERMISSIONS)).toEqual(expect.arrayContaining([
      "productos", "stock", "kardex", "movimientos", "bodegas", "alertas",
    ]));
  });

  it("ventas emite sin recibir administración de stock", () => {
    expect(canEmitFiscalSale(DEFAULT_SALES_PERMISSIONS)).toBe(true);
    expect(allowedSalesCreationModes(DEFAULT_SALES_PERMISSIONS)).toEqual(["fiscal"]);
    expect(allowedInventoryViews(DEFAULT_SALES_PERMISSIONS)).toEqual(["productos"]);
    expect(DEFAULT_SALES_PERMISSIONS).not.toContain("inventario:write");
    expect(DEFAULT_SALES_PERMISSIONS).not.toContain("compras:receive");
  });

  it("bodega opera sus diez vistas sin acceso comercial", () => {
    const views = allowedInventoryViews(DEFAULT_WAREHOUSE_PERMISSIONS);
    expect(views).toHaveLength(10);
    expect(views).toEqual(expect.arrayContaining([
      "productos", "stock", "compras", "recepciones", "proveedores", "kardex", "alertas",
    ]));
    expect(canAccessSection(DEFAULT_WAREHOUSE_PERMISSIONS, "ventas")).toBe(false);
    expect(canEmitFiscalSale(DEFAULT_WAREHOUSE_PERMISSIONS)).toBe(false);
    expect(allowedSalesCreationModes(DEFAULT_WAREHOUSE_PERMISSIONS)).toEqual([]);
  });
});

describe("migración aditiva para bases ya existentes", () => {
  it("completa a gerente con inventario y emisión/gestión fiscal", () => {
    for (const permission of [
      "inventario:read", "inventario:write", "facturacion:read", "facturacion:write",
    ]) {
      expect(managerMigration).toContain(`'${permission}'`);
      expect(DEFAULT_MANAGER_PERMISSIONS).toContain(permission);
    }
    expect(managerMigration).toContain('"permisos" || ARRAY[');
    expect(managerMigration).toContain('"estado" = \'activo\'');
  });

  it("completa a bodega sin abrir Ventas, clientes, precios ni facturación", () => {
    for (const permission of [
      "inventario:read", "inventario:write", "inventario:delete",
      "compras:read", "compras:write", "compras:receive",
    ]) {
      expect(warehouseMigration).toContain(`'${permission}'`);
      expect(DEFAULT_WAREHOUSE_PERMISSIONS).toContain(permission);
    }
    for (const forbidden of ["ordenes:", "clientes:", "precios:", "facturacion:"]) {
      expect(warehouseMigration).not.toContain(forbidden);
    }
    expect(warehouseMigration).toContain('"permisos" || ARRAY[');
    expect(warehouseMigration).toContain('"estado" = \'activo\'');
  });
});
