import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ preview: null }));
vi.mock("../lib/document-preview", () => ({
  closeDocumentPreview: vi.fn(),
  getDocumentPreview: () => state.preview,
  // Solo este test monta el estado cliente en SSR para inspeccionar el JSX.
  getServerDocumentPreview: () => state.preview,
  subscribeDocumentPreview: () => () => {},
}));
import DocumentPreview from "../app/document-preview";

const render = () => renderToStaticMarkup(createElement(DocumentPreview));
beforeEach(() => { state.preview = null; });

describe("montaje del visor de impresión", () => {
  it("no monta un iframe ni datos cuando no hay documento", () => {
    expect(render()).toBe("");
  });
  it("muestra el estado de preparación antes de recibir el documento", () => {
    state.preview = { id: 1, url: null, filename: "" };
    const html = render();
    expect(html).toContain("Preparando documento…");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("Guardar copia");
  });
  it("HTML se monta con srcdoc, no con una navegación blob, y espera contenido real", () => {
    state.preview = { id: 1, url: "blob:solo-descarga", filename: "factura.html", html: '<main class="sheet">Factura L 285.00</main>' };
    const html = render();
    const iframe = html.match(/<iframe\b[^>]*>/)?.[0];
    expect(iframe).toMatch(/srcDoc="/i);
    expect(iframe).toContain("Factura L 285.00");
    expect(iframe).not.toMatch(/\bsrc="blob:/);
    expect(iframe).toContain('aria-hidden="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cargando vista previa…");
    expect(html).toContain('href="blob:solo-descarga"');
    expect(html).toContain('download="factura.html"');
    expect(html).toContain("Cerrar");
  });
  it("PDF conserva el visor nativo, sin convertir bytes a HTML", () => {
    state.preview = { id: 2, url: "blob:pdf", filename: "factura.pdf" };
    const iframe = render().match(/<iframe\b[^>]*>/)?.[0];
    expect(iframe).toContain('src="blob:pdf"');
    expect(iframe).not.toMatch(/srcDoc=/i);
  });
});
