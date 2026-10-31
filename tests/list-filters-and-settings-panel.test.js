import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), success: vi.fn(), error: vi.fn() } }));
import Workers from "../app/admin/workers-section";
import Roles from "../app/admin/roles-section";
import Categories from "../app/admin/categorias-section";
import Branches from "../app/admin/sucursales-section";
import Clients from "../app/admin/clientes-section";
import Ajustes from "../app/admin/ajustes-section";
import FacturacionPanel from "../app/admin/facturacion-panel";
import VentasSection from "../app/admin/ventas-section";
import { SECTION_NAV_CONFIG } from "../app/admin/admin-nav";
import { ALL_PERMISSIONS } from "../lib/permisos";
const session = { correo: "qa@arconet.local", permisos: ALL_PERMISSIONS };
const render = (Component, extra = {}) => renderToStaticMarkup(createElement(Component, { session, ...extra }));
describe("listados con una sola píldora y selección explícita", () => {
  it.each([["trabajadores", "Trabajadores", Workers], ["roles", "Roles", Roles], ["categorias", "Categorías", Categories], ["sucursales", "Sucursales", Branches], ["clientes", "Clientes", Clients]])("%s conserva sólo su etiqueta de ubicación", (key, label, Component) => {
    expect(SECTION_NAV_CONFIG[key].tabs).toHaveLength(1);
    const html = render(Component);const marker = html.match(new RegExp(`<nav[^>]*aria-label="Sección ${label}"[\\s\\S]*?<\\/nav>`))?.[0];
    expect(marker).toBeTruthy();expect(marker).toContain(label);expect(marker).not.toContain("<button");
    expect(marker).not.toMatch(/Activos|Inactivos|San Pedro|La Ceiba|Gerencia/);
  });
  it("Trabajadores mantiene sucursal, rol y estado en sus selectores, no accesos de pestaña", () => {
    const html = render(Workers, { workers: [{ id: "w", nombre: "QA", correo: "qa", rol: "personalizado", sucursal: "s", estado: "activo" }], sucursales: [{ id: "s", nombre: "Sucursal QA" }] });
    for (const label of ["Filtrar por sucursal", "Filtrar por rol", "Filtrar por estado"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('<option value="personalizado">personalizado</option>');
  });
  it("Roles y Sucursales tienen selector de estado, Categorías además uso y Clientes conserva estados", () => {
    expect(render(Roles)).toContain('aria-label="Filtrar roles por estado"');
    expect(render(Branches)).toContain('aria-label="Filtrar sucursales por estado"');
    expect(render(Categories)).toContain('aria-label="Filtrar categorías por productos"');
    expect(render(Categories)).toContain('aria-label="Filtrar categorías por estado"');
    expect(render(Clients)).toContain('aria-label="Filtrar por estado"');
  });
});
describe("Ajustes empresarial y emisión con feedback dentro del formulario", () => {
  it("Ventas no ofrece una segunda configuración fiscal aunque sea administrador", () => {
    const html = render(VentasSection);expect(html).not.toContain("> Configuración fiscal</button>");expect(html).not.toContain('aria-label="CAI"');
  });
  it("el editor fiscal no incluye controles para editar CAI ni correlativos", () => {
    const html = render(FacturacionPanel);expect(html).not.toContain("Próximo correlativo");expect(html).not.toContain("Guardar configuración");
  });
  it("Ajustes contiene el centro empresarial y la sección fiscal protegida", () => {
    const html = render(Ajustes);expect(html).toContain("Centro de configuración empresarial");expect(html).toContain('aria-label="Configuración fiscal y CAI"');expect(html).toContain("Mi perfil");
  });
  it("la factura tiene feedback focalizable, validación propia y datos faltantes visibles", () => {
    const html = render(FacturacionPanel, { embedded: true, saleEditorOpen: true });
    expect(html).toContain('id="invoice-feedback"');expect(html).toContain('tabindex="-1"');expect(html).toContain("Falta completar la venta");expect(html).toContain("Selecciona un cliente");expect(html).toContain("Añade al menos un producto");expect(html).toMatch(/novalidate/i);
  });
});
