import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_MANAGER_PERMISSIONS, DEFAULT_SALES_PERMISSIONS, DEFAULT_WAREHOUSE_PERMISSIONS } from "../lib/roles-defaults";
import { canAccessSection } from "../lib/permisos";
import { defaultAdminSection } from "../lib/admin-navigation";
import AjustesSection from "../app/admin/ajustes-section";

const migration = readFileSync("prisma/migrations/20261105000000_gerente_lectura_ajustes/migration.sql", "utf8");

describe("consulta de Ajustes para gerente", () => {
  it("permite abrir la sección solicitada sin conceder escritura", () => {
    expect(DEFAULT_MANAGER_PERMISSIONS).toContain("ajustes:read");
    expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain("ajustes:write");
    expect(canAccessSection(DEFAULT_MANAGER_PERMISSIONS, "ajustes")).toBe(true);
    expect(defaultAdminSection(DEFAULT_MANAGER_PERMISSIONS, "ajustes")).toBe("ajustes");
    expect(canAccessSection(DEFAULT_SALES_PERMISSIONS, "ajustes")).toBe(false);
    expect(canAccessSection(DEFAULT_WAREHOUSE_PERMISSIONS, "ajustes")).toBe(false);
  });
  it("informa el modo de solo lectura en el panel", () => {
    const html = renderToStaticMarkup(createElement(AjustesSection, { session: { rol: "gerente", permisos: DEFAULT_MANAGER_PERMISSIONS }, workers: [] }));
    expect(html).toContain("Acceso de solo lectura");
    expect(html).toContain("Menú de navegación");
    expect(html).toContain("Datos fiscales y CAI");
  });
  it("actualiza el rol existente de forma aditiva e idempotente sin reactivarlo", () => {
    expect(migration).toContain('array_append("permisos", \'ajustes:read\')');
    expect(migration).toContain('NOT (\'ajustes:read\' = ANY("permisos"))');
    expect(migration).toContain('"slug" = \'gerente\'');
    expect(migration).not.toContain("ajustes:write");
    expect(migration).not.toMatch(/SET[\s\S]*"estado"\s*=/);
  });
});
