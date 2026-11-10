import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("../app/admin/admin-ui", () => ({ useToast: () => ({ show: () => {} }) }));
vi.mock("../app/admin/topbar", () => ({ Topbar: () => null }));
vi.mock("../app/admin/public-pages-settings", () => ({ default: () => createElement("div", null, "Control de páginas") }));
vi.mock("../app/admin/dock-menu-settings", () => ({ default: ({ menuNumber }) => createElement("div", null, `Editor real ${menuNumber}`) }));
vi.mock("../app/admin/fiscal-settings-panel", () => ({ default: () => createElement("div", null, "Control fiscal") }));
import AjustesSection from "../app/admin/ajustes-section";

describe("organización de Ajustes", () => {
  it("agrupa las opciones en secciones cerradas sin desmontar sus editores", () => {
    const html = renderToStaticMarkup(createElement(AjustesSection, { session: { permisos: ["ajustes:read", "ajustes:write"] } }));
    for (const title of ["Sitio público", "Páginas públicas", "Menú de navegación 1", "Menú de navegación 2", "Empresa y facturación", "Configuración general", "Datos fiscales y CAI", "Sistema", "Información del sistema"]) expect(html).toContain(title);
    expect(html.match(/<details/g)).toHaveLength(6);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    for (const content of ["Control de páginas", "Editor real 1", "Editor real 2", "Control fiscal"]) expect(html).toContain(content);
  });
  it("conserva los indicadores de cambios y los apartados de cada editor", () => {
    const page = readFileSync("app/admin/ajustes-section.js", "utf8");
    const menu = readFileSync("app/admin/dock-menu-settings.js", "utf8");
    const fiscal = readFileSync("app/admin/fiscal-settings-panel.js", "utf8");
    for (const name of ["menu1Dirty", "menu2Dirty", "companyDirty", "fiscalDirty"]) expect(page).toContain(`pending={${name}}`);
    expect(page).toContain("Sin guardar");
    for (const name of ["Desplegable visual", "Enlaces de la barra", "Enlaces inferiores", "Acceso destacado", "Guardar menú"]) expect(menu).toContain(name);
    expect(menu).toContain("onDirtyChange?.(dirty)");
    expect(fiscal).toContain("onDirtyChange?.(Boolean(draft && saved");
    expect(menu).toContain('role="status"'); expect(menu).toContain('role="alert"');
  });
});
