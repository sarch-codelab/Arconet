import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, canAccessSection } from "@/lib/permisos";
import { defaultAdminSection, resolveAdminSection } from "@/lib/admin-navigation";
import { DEFAULT_MANAGER_PERMISSIONS, DEFAULT_SALES_PERMISSIONS, DEFAULT_WAREHOUSE_PERMISSIONS } from "@/lib/roles-defaults";
const roles = [
  ["administrador", ALL_PERMISSIONS], ["gerente", DEFAULT_MANAGER_PERMISSIONS],
  ["ventas", DEFAULT_SALES_PERMISSIONS], ["bodega", DEFAULT_WAREHOUSE_PERMISSIONS],
  ["tecnico", ["productos:read", "ordenes:read"]], ["lectura", ["productos:read"]],
  ["precios", ["precios:read"]], ["personalizado-sin-permisos", []],
];
describe("Monica IA para todos los roles del panel", () => {
  it.each(roles)("%s accede a la píldora y a su URL directa sin permisos especiales", (_role, permissions) => {
    expect(canAccessSection(permissions, "ia")).toBe(true);
    expect(defaultAdminSection(permissions, "ia")).toBe("ia");
    expect(resolveAdminSection("https://arconet.test/panel-administrativo?section=ia", permissions, "mi-perfil")).toBe("ia");
  });
  it("el acceso común a IA no concede accesos a otros módulos", () => {
    for (const section of ["roles", "trabajadores", "ventas", "inventario", "ajustes"]) {
      expect(canAccessSection([], section)).toBe(false);
    }
    expect(canAccessSection(DEFAULT_WAREHOUSE_PERMISSIONS, "ventas")).toBe(false);
  });
});
