import { describe, expect, it } from "vitest";
import { defaultDockMenu, validMenuHref, validateDockMenu, visibleDockMenu } from "../lib/dock-menu";

describe("contenido del menú 2", () => {
  it("conserva inicialmente el orden y los destinos originales", () => {
    const menu = defaultDockMenu(); expect(validateDockMenu(menu)).toEqual(menu);
    expect(menu.items.map((i) => i.label)).toEqual(["Inicio", "Soluciones", "Tienda", "La empresa", "Nosotros", "Contacto"]);
    const visible = visibleDockMenu(menu, true); expect(visible.items[0].href).toBe("/#inicio"); expect(visible.items[1].megaGroups[0].links[0].href).toContain("/tienda/");
  });
  it("respeta orden, visibilidad y grupos anidados sin cambiar los datos editables", () => {
    const menu = defaultDockMenu(); menu.items.reverse(); menu.items[0].enabled = false;
    const solutions = menu.items.find((item) => item.id === "soluciones"); solutions.groups[0].enabled = false; solutions.groups[1].links[0].enabled = false;
    const visible = visibleDockMenu(validateDockMenu(menu)); expect(visible.items[0].label).toBe("Nosotros");
    const groups = visible.items.find((item) => item.label === "Soluciones").megaGroups; expect(groups).toHaveLength(3); expect(groups[0].links[0].label).toBe("Herrajes");
    expect(menu.items[0].enabled).toBe(false);
  });
  it.each(["javascript:alert(1)", "//ejemplo.com", "https://user:pass@example.com", "/\\evil.com", "data:text/html,x", "https://ejemplo.com/ espacio", ""])('rechaza destino inseguro %s', (url) => expect(validMenuHref(url)).toBe(false));
  it.each(["/tienda", "/catalogo?tipo=red", "#inicio", "https://example.com/ruta"])("acepta destinos seguros %s", (url) => expect(validMenuHref(url)).toBe(true));
  it("rechaza ids repetidos, datos malformados y exceso de entradas", () => {
    const menu = defaultDockMenu(); menu.items[1].id = menu.items[0].id; expect(() => validateDockMenu(menu)).toThrow();
    const other = defaultDockMenu(); other.items[0].href = "javascript:alert(1)"; expect(() => validateDockMenu(other)).toThrow();
    const long = defaultDockMenu(); long.items = Array.from({ length: 22 }, (_, i) => ({ id: `long-${i}`, label: "Enlace", href: "/", enabled: true, groups: [] })); expect(() => validateDockMenu(long)).toThrow();
  });
});
