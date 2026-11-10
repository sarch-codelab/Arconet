import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DropdownVisualEditor from "../app/admin/dropdown-visual-editor";
import { defaultDockMenu, validateDockMenu, visibleDockMenu } from "../lib/dock-menu";

const render = (menu, canWrite = true, menuNumber = 1) => renderToStaticMarkup(createElement(DropdownVisualEditor, { menu, canWrite, menuNumber, change: () => {} }));

describe("editor visual de desplegables", () => {
  it("presenta los grupos y enlaces reales de Soluciones en tarjetas editables", () => {
    const menu = defaultDockMenu();
    const html = render(menu);
    expect(html).toContain('aria-labelledby="dropdown-editor-title-1"');
    expect(html).toContain('value="soluciones" selected');
    expect(html).toContain('aria-label="Grupo Red óptica y FTTH"');
    expect(html).toContain('value="Componentes pasivos"');
    expect(html).toContain('value="/tienda/categoria/componentes-pasivos"');
    expect(html).toContain("Añadir grupo desplegable");
    expect(html).toContain("Añadir enlace al grupo");
    expect(html).toContain("Login"); expect(html).toContain("Admin");
  });

  it("conserva visibles para edición los elementos ocultos sin publicarlos", () => {
    const menu = defaultDockMenu();
    const group = menu.items[1].groups[0];
    group.enabled = false; group.links[0].enabled = false;
    const html = render(menu);
    expect(html).toContain(`aria-label="Grupo ${group.title}"`);
    expect(html).toContain(`value="${group.links[0].label}"`);
    expect(visibleDockMenu(validateDockMenu(menu)).items[1].megaGroups.find((item) => item.id === group.id)).toBeUndefined();
  });

  it("respeta permisos, acceso destacado oculto y límite de grupos", () => {
    const menu = defaultDockMenu(); menu.primary.enabled = false;
    menu.items[1].groups = Array.from({ length: 8 }, (_, i) => ({ id: `test-${i}`, title: `Grupo ${i}`, enabled: true, links: [] }));
    const html = render(menu);
    expect(html).not.toContain("Explora todos los productos");
    expect(html).toMatch(/disabled=""[^>]*>\+ Añadir grupo desplegable/);
    const readonly = render(menu, false, 2);
    expect(readonly).toContain('aria-labelledby="dropdown-editor-title-2"');
    expect(readonly).toMatch(/disabled=""[^>]*value="Grupo 0"/);
  });

  it("admite un menú sin enlaces y permite elegir otros desplegables", () => {
    const menu = defaultDockMenu();
    expect(render(menu)).toContain('value="enlace-2"');
    menu.items = [];
    expect(render(menu)).toContain("Añade primero un enlace a la barra");
  });
});
