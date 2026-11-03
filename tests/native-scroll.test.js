import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeNativeScroll } from "../lib/native-scroll";

let frames, listeners, resize, element, win, doc;
const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
beforeEach(() => {
  frames = new Map(); listeners = new Map(); let next = 0;
  element = { scrollIntoView: vi.fn() };
  doc = { documentElement: { scrollHeight: 3000 }, body: {}, querySelector: vi.fn(() => element) };
  win = {
    scrollY: 0, innerHeight: 1000, scrollTo: vi.fn(), matchMedia: vi.fn(() => ({ matches: false })),
    requestAnimationFrame: vi.fn(fn => { frames.set(++next, fn); return next; }),
    cancelAnimationFrame: vi.fn(id => frames.delete(id)),
    addEventListener: vi.fn((name, fn) => listeners.set(name, fn)),
    removeEventListener: vi.fn((name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); }),
  };
  vi.stubGlobal("window", win); vi.stubGlobal("document", doc);
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback) { this.callback = callback; this.observe = vi.fn(); this.disconnect = vi.fn(); resize = this; }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("observador de scroll nativo", () => {
  it("no intercepta rueda, touch ni teclado y agrupa eventos en un solo frame", () => {
    const update = vi.fn(); observeNativeScroll(update); flush(); update.mockClear();
    expect([...listeners.keys()]).toEqual(["scroll", "resize"]);
    expect(win.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
    win.scrollY = 800;
    for (let i = 0; i < 30; i++) listeners.get("scroll")();
    expect(frames.size).toBe(1); expect(update).not.toHaveBeenCalled();
    flush(); expect(update).toHaveBeenCalledExactlyOnceWith({ scroll: 800, limit: 2000, progress: 0.4 });
    expect(frames.size).toBe(0); // Ningún RAF se renueva al estar en reposo.
  });
  it("solo vuelve a medir dimensiones al cambiar el contenido o viewport", () => {
    const update = vi.fn(), measure = vi.fn(); observeNativeScroll(update, { onResize: measure }); flush();
    doc.documentElement.scrollHeight = 5000; win.scrollY = 1000;
    listeners.get("scroll")(); flush(); expect(update.mock.lastCall[0].limit).toBe(2000);
    resize.callback(); flush(); expect(update.mock.lastCall[0].limit).toBe(4000);
    expect(measure).toHaveBeenCalledTimes(2);
    expect(resize.observe).toHaveBeenCalledWith(element);
    win.innerHeight = 2000; listeners.get("resize")(); flush();
    expect(update.mock.lastCall[0].limit).toBe(3000);
  });
  it("acota progreso en páginas cortas y durante overscroll", () => {
    const update = vi.fn(); doc.documentElement.scrollHeight = 400;
    observeNativeScroll(update); flush(); expect(update.mock.lastCall[0].progress).toBe(0);
    win.scrollY = -50; listeners.get("scroll")(); flush(); expect(update.mock.lastCall[0].progress).toBe(0);
    win.scrollY = 100; listeners.get("scroll")(); flush(); expect(update.mock.lastCall[0].progress).toBe(1);
  });
  it("destruye listeners, observador y trabajo pendiente sin callbacks tardíos", () => {
    const update = vi.fn(), measure = vi.fn(); const controller = observeNativeScroll(update, { onResize: measure });
    controller.destroy(); flush(); resize.callback(); controller.refresh(); flush();
    expect(update).not.toHaveBeenCalled(); expect(listeners.size).toBe(0);
    expect(resize.disconnect).toHaveBeenCalledOnce(); expect(measure).toHaveBeenCalledTimes(1);
  });
  it("mantiene enlaces y navegación programática sin animar la rueda", () => {
    const controller = observeNativeScroll(vi.fn()); controller.scrollTo("#soluciones");
    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    controller.scrollTo(700); expect(win.scrollTo).toHaveBeenLastCalledWith({ top: 700, behavior: "smooth" });
    controller.scrollTo(0, { immediate: true }); expect(win.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
    win.matchMedia.mockReturnValue({ matches: true }); controller.scrollTo(300);
    expect(win.scrollTo).toHaveBeenLastCalledWith({ top: 300, behavior: "instant" });
    expect(() => { doc.querySelector.mockReturnValue(null); controller.scrollTo("#inexistente"); }).not.toThrow();
  });
  it("funciona sin ResizeObserver en navegadores antiguos", () => {
    vi.stubGlobal("ResizeObserver", undefined); const update = vi.fn();
    const controller = observeNativeScroll(update); flush(); listeners.get("resize")(); flush();
    expect(update).toHaveBeenCalledTimes(2); expect(() => controller.destroy()).not.toThrow();
  });
});
