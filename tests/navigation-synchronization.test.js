import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { defaultDockMenu, validateDockMenu, visibleDockMenu } from "../lib/dock-menu";

describe("enlace de Tienda y acceso destacado", () => {
  it("refleja nombre, destino y visibilidad del enlace original en el destacado", () => {
    const menu = defaultDockMenu(); const item = menu.items.find(i => i.id === "enlace-2");
    item.label = "Catálogo actualizado"; item.href = "/catalogo";
    expect(visibleDockMenu(validateDockMenu(menu)).primary).toMatchObject({ label: "Catálogo actualizado", href: "/catalogo", enabled: true });
    item.enabled = false; expect(visibleDockMenu(validateDockMenu(menu)).primary.enabled).toBe(false);
    menu.items = menu.items.filter(i => i.id !== "enlace-2"); expect(visibleDockMenu(validateDockMenu(menu)).primary.enabled).toBe(false);
  });
  it("permite mantener el acceso destacado independiente", () => {
    const menu = defaultDockMenu(); menu.primary.linked = false; menu.primary.label = "Promoción"; menu.primary.href = "/contacto";
    menu.items.find(i => i.id === "enlace-2").enabled = false;
    expect(visibleDockMenu(validateDockMenu(menu)).primary).toMatchObject({ label: "Promoción", href: "/contacto", enabled: true });
  });
  it("adapta el acceso original guardado y respeta los personalizados", () => {
    const menu = defaultDockMenu(); delete menu.primary.linked; menu.items[2].label = "Nueva tienda"; menu.items[2].href = "/catalogo";
    expect(visibleDockMenu(validateDockMenu(menu)).primary.label).toBe("Nueva tienda");
    menu.primary.label = "Oferta especial"; menu.primary.href = "/ayuda";
    expect(visibleDockMenu(validateDockMenu(menu)).primary).toMatchObject({ linked: false, label: "Oferta especial", href: "/ayuda" });
  });
});

describe("menús públicos compartidos y sincronización", () => {
  const read = path => readFileSync(path, "utf8");
  it("usa el menú inicial y el flotante en páginas públicas adicionales", () => {
    const layout = read("app/layout.js"), component = read("app/public-site-navigation.js");
    expect(layout).toContain("<PublicSiteNavigation />");
    for (const route of ["/catalogo", "/contacto", "/ayuda", "/garantias", "/terminos", "/privacidad", "/cookies", "/aviso-legal", "/tienda/"]) expect(component).toContain(`"${route}"`);
    expect(component).toContain('variant="inline" menuNumber={1}'); expect(component).toContain('variant="scroll" visible={scrolled}');
  });
  it("notifica guardados, refresca pestañas abiertas y conserva el último resultado ante fallos", () => {
    const hook = read("app/use-dock-menu.js"), settings = read("app/admin/dock-menu-settings.js");
    expect(settings).toContain("window.localStorage.setItem(MENU_UPDATED_KEY"); expect(settings).toContain("visibleDockMenu(result.menu)");
    for (const event of ["focus", "pageshow", "storage", "visibilitychange"]) expect(hook).toContain(`"${event}"`);
    expect(hook).toContain("15000"); expect(hook).toContain("request === sequence");
  });
});
