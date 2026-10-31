import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import ProductsSection from "../app/admin/products-section";
import { SECTION_NAV_CONFIG } from "../app/admin/admin-nav";
import { INVENTORY_VIEWS } from "../lib/admin-navigation";
import { ALL_PERMISSIONS } from "../lib/permisos";

const session = { correo: "qa@arconet.local", permisos: ALL_PERMISSIONS };

// products-section es cliente; sin datos basta para verificar la estructura de
// navegación y filtros que se pinta antes de hidratar.
const renderProducts = () =>
  renderToStaticMarkup(
    createElement(ProductsSection, {
      session,
      products: [],
      navigation: createElement("nav", { "aria-label": "Sección Inventario" }, "Inventario"),
    })
  );

describe("Productos no duplica la fila de píldoras", () => {
  it("la configuración de sección ya no define pestañas propias", () => {
    expect(SECTION_NAV_CONFIG.productos.tabs).toHaveLength(0);
  });

  it("la sub-navegación de Inventario sigue empezando por Productos", () => {
    expect(INVENTORY_VIEWS[0]).toBe("productos");
  });

  it("no pinta una segunda barra de pestañas debajo de la navegación", () => {
    const html = renderProducts();
    // La topbar siempre trae su propia nav de secciones; lo que se eliminó es
    // la fila de filtros que solo existía en Productos.
    const navs = html.match(/<nav[\s\S]*?<\/nav>/g) ?? [];
    expect(navs.filter(nav => nav.includes("Sección Inventario"))).toHaveLength(1);
    expect(html).not.toContain('aria-label="Filtros de productos"');
  });

  it("En stock y Agotados quedan como filtros de existencias", () => {
    const html = renderProducts();
    expect(html).toContain('aria-label="Filtrar por existencias"');
    expect(html).toContain('<option value="in">En stock</option>');
    expect(html).toContain('<option value="out">Agotados</option>');
  });
});
