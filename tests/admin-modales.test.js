import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn() } }));
import { DialogBackdrop, Overlay } from "../app/admin/admin-overlay";
import { enableDragScroll, countOpenDialogs, registerOpenDialog } from "../app/admin/drag-scroll";
import { ConfirmDialog } from "../app/admin/admin-ui";
import SalesDialog from "../app/admin/sales-dialog";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));

// CSS Modules: las clases llegan como objeto; en Node la hoja real no se carga,
// por eso las aserciones sobre estilos se hacen contra el archivo fuente.
const css = read("app/admin/admin-experience.module.css");
const block = (selector) => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `falta ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
};

describe("emergentes del panel: tamano en PC y tableta", () => {
  it("centra el dialogo con margen garantizado en lugar de pegarlo al borde", () => {
    const overlay = block(".overlay");
    expect(overlay).toMatch(/display:\s*flex/);
    expect(overlay).toMatch(/align-items:\s*center/);
    expect(overlay).toMatch(/justify-content:\s*center/);
    // Padding fluido con un minimo real (antes el modal llegaba a 4 px del borde).
    expect(overlay).toMatch(/padding:\s*clamp\(16px,[^)]*\)\s*clamp\(16px,[^)]*\)/);

    const modal = block(".modal");
    expect(modal).toMatch(/max-width:\s*100%/);
    expect(modal).toMatch(/max-height:\s*calc\(100svh\s*-\s*2\s*\*\s*clamp\(16px/);
    expect(modal).toMatch(/overflow-y:\s*auto/);
  });

  it("mantiene el dialogo centrado en tabletas y ventanas medianas (641-1024 px)", () => {
    // Antes la unica regla por tamano era la hoja inferior de <=640 px, asi que
    // entre 641 y 1024 px el modal heredaba una presentacion sin margen.
    const media = css.slice(css.indexOf("@media (min-width: 641px) and (max-width: 1024px)"));
    const end = media.indexOf("@media (max-width: 640px)");
    const section = media.slice(0, end);
    expect(section).toMatch(/\.overlay\s*\{[^}]*padding:\s*20px/);
    expect(section).toMatch(/\.modal\s*\{[^}]*max-height:\s*calc\(100svh - 40px\)/);
    expect(section).toMatch(/\.modalWide\s*\{[^}]*width:\s*min\(720px, 100%\)/);
  });

  it("conserva la hoja inferior solo en el telefono", () => {
    const start = css.indexOf("@media (max-width: 640px)");
    const section = css.slice(start, css.indexOf("@keyframes sheetIn"));
    expect(section).toMatch(/\.overlay\s*\{[^}]*align-items:\s*flex-end/);
    expect(section).toMatch(/\.modal\s*\{[^}]*border-radius:\s*22px 22px 0 0/);
  });

  it("define las animaciones que usan el velo y el dialogo", () => {
    // `fadeIn` y `riseIn` se referenciaban sin existir: animation-name quedaba
    // en none y la emergente aparecia sin la transicion prevista.
    for (const name of ["fadeIn", "riseIn"]) {
      expect(css).toContain(`animation: ${name} `);
      expect(css).toContain(`@keyframes ${name} {`);
    }
  });

  it("el dialogo de ventas y el velo comparten el mismo alto maximo con margen", () => {
    const ventas = read("app/admin/ventas-section.module.css");
    expect(ventas).toMatch(/max-height:\s*calc\(100svh - 32px\)/);
    expect(ventas).toMatch(/width:\s*min\(700px, calc\(100vw - 24px\)\)/);
    const compras = read("app/admin/compras-panel.module.css");
    expect(compras).toMatch(/\.backdrop\s*\{[^}]*display:\s*flex/);
    expect(compras).toMatch(/\.backdrop\s*\{[^}]*padding:\s*clamp\(16px/);
    expect(compras).toMatch(/\.modal\s*\{[^}]*max-height:\s*calc\(100svh - 2 \* clamp\(16px/);
  });
});

describe("emergentes del panel: deslice con el mouse", () => {
  it("el velo declara el contenedor de arrastre y su cursor", () => {
    // Las reglas de arrastre viven fuera del bloque base de `.overlay`.
    expect(css).toMatch(/\.overlay\[data-drag-scroll\]\s*\{/);
    expect(css).toMatch(/\.overlay\[data-drag-scroll-active="true"\]\s*\{[^}]*cursor:\s*grabbing/);
  });

  it("renderiza el velo con la marca de arrastre y el boton de cierre fuera de foco", () => {
    const html = render(DialogBackdrop, { label: "Cerrar" });
    expect(html).toContain('data-drag-scroll=""');
    expect(html).toContain('role="presentation"');
  });

  it("las confirmaciones comparten el velo del panel", () => {
    const html = render(ConfirmDialog, {
      title: "Eliminar",
      message: "¿Seguro?",
      onCancel: () => {},
      onConfirm: () => {},
    });
    // ConfirmDialog usa hooks: en SSR devuelve el mismo marcado del velo.
    expect(html).toContain('role="dialog"');
    expect(html).toContain("¿Seguro?");
  });

  it("el dialogo de ventas se puede arrastrar y registra una emergente abierta", () => {
    const source = read("app/admin/sales-dialog.js");
    expect(source).toContain("enableDragScroll(element)");
    expect(source).toContain("registerOpenDialog()");
    expect(source).toContain('data-drag-scroll=""');
    expect(source).not.toContain("onMouseDown=");
  });

  it("cuenta emergentes abiertas y libera el registro al cerrar", () => {
    const before = countOpenDialogs();
    const close = registerOpenDialog();
    expect(countOpenDialogs()).toBe(before + 1);
    close();
    expect(countOpenDialogs()).toBe(before);
  });

  it("no instala listeners sin documento ni con puntero grueso", () => {
    // SSR / Node: no hay `window`, la funcion debe devolver un limpiador inerte.
    expect(typeof enableDragScroll(null)).toBe("function");
    expect(() => enableDragScroll(null)()).not.toThrow();
  });

  it("la rueda dentro de una emergente no queda cancelada por Lenis", () => {
    // Causa del reporte "no me detecta el mouse": Lenis escucha `wheel` en la
    // ventana y llama preventDefault. Con la pagina bloqueada por el modal, la
    // rueda dentro del dialogo se cancelaba y el contenido no se movia.
    // `data-lenis-prevent` hace que Lenis devuelva ANTES de preventDefault, de
    // modo que el navegador desplace el dialogo de forma nativa.
    const overlay = read("app/admin/admin-overlay.js");
    expect(overlay).toContain('data-lenis-prevent=""');
    // La funcion `prevent` es la red de seguridad para dialogos nativos.
    const smooth = read("app/admin/use-smooth-scroll.js");
    expect(smooth).toContain("prevent:");
    expect(smooth).toContain('closest("[data-admin-overlay], dialog[open]")');

    for (const path of ["app/admin/sales-dialog.js", "app/admin/barcode-scan.js"]) {
      expect(read(path), `${path} debe impedir que Lenis cancele la rueda`).toContain(
        'data-lenis-prevent=""',
      );
    }
  });

  it("detiene el scroll suave de la pagina mientras hay una emergente", () => {
    const source = read("app/admin/use-smooth-scroll.js");
    expect(source).toContain("subscribeToOpenDialogs");
    expect(source).toContain("lenis.stop()");
    expect(source).toContain("lenis.start()");
  });

  it("la hoja del escaner tambien se desliza y bloquea el fondo", () => {
    const source = read("app/admin/barcode-scan.js");
    expect(source).toContain("enableDragScroll(sheetRef.current)");
    expect(source).toContain("useBodyScrollLock(open)");
    const sheet = read("app/admin/barcode-scan.module.css");
    expect(sheet).toMatch(/\.sheet\s*\{[^}]*overflow-y:\s*auto/);
  });
});

describe("emergentes del panel: montaje en el cuerpo del documento", () => {
  it("todas las emergentes de las secciones usan el velo compartido", () => {
    const sections = [
      "app/admin/categorias-section.js",
      "app/admin/clientes-section.js",
      "app/admin/sucursales-section.js",
      "app/admin/workers-section.js",
      "app/admin/products-section.js",
      "app/admin/roles-section.js",
      "app/admin/cotizaciones-section.js",
      "app/admin/facturacion-panel.js",
      "app/admin/precios-panel.js",
      "app/admin/perfil-section.js",
      "app/admin/compras-panel.js",
      "app/admin/purchase-editor.js",
      "app/admin/admin-ui.js",
    ];
    for (const path of sections) {
      const source = read(path);
      expect(source, `${path} debe usar DialogBackdrop`).toContain("DialogBackdrop");
      // El velo se pasa como prop de DialogBackdrop; no puede repetirse como
      // el contenedor manual anterior (`<div className={styles.overlay}>`).
      expect(source, `${path} no debe repetir el velo manual`).not.toMatch(
        /<div[^>]*className=\{\s*[`$\{]*\s*(?:adminStyles|styles)\.overlay/,
      );
    }
  });

  it("cada dialogo declara su propio contenedor de arrastre", () => {
    const dialogs = [
      "app/admin/categorias-section.js",
      "app/admin/clientes-section.js",
      "app/admin/sucursales-section.js",
      "app/admin/workers-section.js",
      "app/admin/products-section.js",
      "app/admin/roles-section.js",
      "app/admin/cotizaciones-section.js",
      "app/admin/facturacion-panel.js",
      "app/admin/precios-panel.js",
      "app/admin/perfil-section.js",
      "app/admin/compras-panel.js",
      "app/admin/purchase-editor.js",
      "app/admin/admin-ui.js",
      "app/admin/sales-dialog.js",
      "app/admin/barcode-scan.js",
    ];
    for (const path of dialogs) {
      const source = read(path);
      const count = (source.match(/data-drag-scroll/g) || []).length;
      expect(count, `${path} debe marcar su contenedor con scroll`).toBeGreaterThan(0);
    }
  });

  it("el velo se monta en <body> mediante un portal", () => {
    const source = read("app/admin/admin-overlay.js");
    expect(source).toContain('import { createPortal } from "react-dom"');
    expect(source).toContain("document.body");
    expect(source).toContain("registerOpenDialog");
  });

  it("ninguna seccion conserva el cierre por onMouseDown en el velo", () => {
    const files = read("app/admin/workers-section.js") + read("app/admin/roles-section.js") + read("app/admin/products-section.js");
    expect(files).not.toContain("if (event.target === event.currentTarget) closeModal()");
  });

  it("Overlay no renderiza nada en el servidor y no rompe el arbol", () => {
    expect(render(Overlay, { open: true, children: "x" })).toBe("");
  });

  it("SalesDialog mantiene su estructura de dialogo nativo", () => {
    const html = render(SalesDialog, { open: false, title: "Nueva venta", onClose: () => {} });
    expect(html).toContain("<dialog");
    expect(html).toContain("Nueva venta");
    expect(html).toContain('aria-labelledby');
  });
});
