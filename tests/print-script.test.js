import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { PRINT_PAPERS, renderOrderDocument } from "../lib/print-document";
import { order, settings } from "./fixtures/print-documents";

// Ejecutar el script real del documento, no una reimplementación del selector.
async function mountScript({ standalone = false, inaccessibleParent = false, images = [], fontsReady = Promise.resolve() } = {}) {
  const changeHandlers = new Map();
  const printHandlers = new Map();
  const selector = { value: "auto", addEventListener: (type, handler) => changeHandlers.set(type, handler) };
  const rule = { textContent: "" };
  const help = { textContent: "" };
  const measure = { style: {}, setAttribute: vi.fn(), remove: vi.fn(), getBoundingClientRect: () => ({ height: 450 }) };
  const parent = { location: { origin: "https://arconet.example" }, postMessage: vi.fn() };
  if (inaccessibleParent) Object.defineProperty(parent, "location", { get() { throw new Error("Cross-origin parent"); } });
  const window = { location: { origin: "null" }, parent, addEventListener: vi.fn(), print: vi.fn() };
  if (standalone) window.parent = window;
  const document = {
    body: { dataset: {}, appendChild: vi.fn() },
    images,
    fonts: { ready: fontsReady },
    querySelector: () => ({ cloneNode: () => measure }),
    getElementById: id => ({
      "paper-size": selector,
      "paper-rule": rule,
      "paper-help": help,
      "print-document": { addEventListener: (type, handler) => printHandlers.set(type, handler) },
    })[id],
  };
  const script = renderOrderDocument({ order, settings }).match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(script, { window, document });
  await new Promise(setImmediate);
  return {
    window, document, parent, rule,
    change(paper) { selector.value = paper; return changeHandlers.get("change").call(selector); },
    print: () => printHandlers.get("click")(),
  };
}

describe("script de impresión dentro de srcdoc", () => {
  it.each(Object.keys(PRINT_PAPERS))("seleccionar %s conserva el formato y notifica al origen real del padre", async paper => {
    const context = await mountScript();
    context.change(paper);
    expect(context.document.body.dataset).toEqual({ paper, layout: PRINT_PAPERS[paper].kind });
    expect(context.rule.textContent).toContain("@page");
    expect(context.parent.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "arconet:print-paper", paper }, "https://arconet.example");
    expect(context.window.print).not.toHaveBeenCalled();
  });
  it("ignora un formato falsificado sin enviar mensajes ni imprimir", async () => {
    const context = await mountScript();
    context.change("__proto__");
    expect(context.parent.postMessage).not.toHaveBeenCalled();
    expect(context.window.print).not.toHaveBeenCalled();
  });
  it("un HTML guardado por separado no depende de tener un padre", async () => {
    const context = await mountScript({ standalone: true });
    expect(() => context.change("media-carta")).not.toThrow();
    expect(context.document.body.dataset.paper).toBe("media-carta");
    expect(context.parent.postMessage).not.toHaveBeenCalled();
  });
  it("si el padre no es accesible no usa '*' ni deja de cambiar el papel", async () => {
    const context = await mountScript({ inaccessibleParent: true });
    expect(() => context.change("ticket-58")).not.toThrow();
    expect(context.document.body.dataset.paper).toBe("ticket-58");
    expect(context.parent.postMessage).not.toHaveBeenCalled();
  });
  it("Imprimir espera al logo y las fuentes y llama a print en el mismo documento", async () => {
    let releaseLogo, releaseFont;
    const logoReady = new Promise(resolve => { releaseLogo = resolve; });
    const fontsReady = new Promise(resolve => { releaseFont = resolve; });
    const context = await mountScript({ images: [{ decode: () => logoReady }], fontsReady });
    const printing = context.print();
    expect(context.window.print).not.toHaveBeenCalled();
    releaseLogo();
    await new Promise(setImmediate);
    expect(context.window.print).not.toHaveBeenCalled();
    releaseFont();
    await printing;
    expect(context.window.print).toHaveBeenCalledOnce();
  });
});
