import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PANEL = "app/admin/facturacion-panel.js";
const CSS = "app/admin/facturacion-panel.module.css";
const CARRITO = "app/admin/carrito-cliente.js";
const PAGINA = "app/admin/ventas/nueva/nueva-venta.js";
const PAGINA_CSS = "app/admin/ventas/nueva/nueva-venta.module.css";

const leer = (archivo) => readFileSync(archivo, "utf8");

describe("responsive de Nueva venta", () => {
  it("la grilla fiscal pasa realmente a una columna en tablet y móvil", () => {
    const css = leer(CSS);
    const mobile = css.slice(css.lastIndexOf("@media (max-width: 900px)"));

    expect(mobile).toMatch(/\.embedded \.editorLayout \.invoiceGrid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.embedded \.editorLayout\s*\{[^}]*max-width: 1800px/);
    expect(css).toMatch(/@media \(max-width: 1240px\)[\s\S]*?\.embedded \.editorLayout\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  });

  it("campos y acciones no fuerzan el ancho en teléfonos", () => {
    const css = leer(CSS);
    const mobile = css.slice(css.lastIndexOf("@media (max-width: 640px)"));

    expect(mobile).toMatch(/\.lineaGrid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(mobile).toMatch(/\.linesCard > header > div:last-child\s*\{[^}]*display: grid/);
    expect(mobile).toMatch(/\.linesCard > header button,[\s\S]*?width: 100%/);
    expect(css).toMatch(/\.resumen button\s*\{[^}]*white-space: normal/);
    expect(css).toContain(".editorLayout > *");
  });

  it("la cabecera usa clases responsive y no paddings rígidos en línea", () => {
    const js = leer(PAGINA);
    const css = leer(PAGINA_CSS);

    expect(js).toContain("pageStyles.pageHeader");
    expect(js).toContain("pageStyles.backLink");
    expect(js).toContain("pageStyles.accountName");
    expect(js).not.toContain('style={{ padding:');
    expect(css).toContain("@media (max-width: 620px)");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("indexa los productos una vez en lugar de buscarlos por cada línea", () => {
    for (const archivo of [PANEL, CARRITO]) {
      const js = leer(archivo);
      expect(js, archivo).toContain("new Map(productos.map");
      expect(js, archivo).toContain("productosPorId.get(linea.productoId)");
      expect(js, archivo).not.toContain("productos.find");
    }
  });
});
