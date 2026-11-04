import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachPillScroll, revealActivePill } from '../lib/pill-scroll';
import { readFileSync } from 'node:fs';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const listeners = {};
  const nav = { scrollWidth: 600, clientWidth: 300, scrollLeft: 0,
    addEventListener: vi.fn((name, fn) => { listeners[name] = fn; }), removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, right: 300 }), querySelector: () => null,
    contains: () => true, setPointerCapture: vi.fn(), hasPointerCapture: () => false,
  };
  const stop = attachPillScroll(nav);
  const wheel = overrides => { const event = { deltaX: 0, deltaY: 60, deltaMode: 0, preventDefault: vi.fn(), ...overrides }; listeners.wheel(event); return event; };
  return { nav, listeners, stop, wheel };
}
describe('pildoras del cliente', () => {
  it('desplaza horizontalmente la rueda vertical solo cuando hay espacio', () => {
    const { nav, wheel } = fixture();
    expect(wheel().preventDefault).toHaveBeenCalledOnce(); expect(nav.scrollLeft).toBe(60);
    nav.scrollLeft = 300; expect(wheel().preventDefault).not.toHaveBeenCalled();
    nav.scrollLeft = 0; expect(wheel({ deltaY: -40 }).preventDefault).not.toHaveBeenCalled();
    nav.scrollWidth = 200; expect(wheel().preventDefault).not.toHaveBeenCalled();
  });
  it.each([{ ctrlKey: true }, { shiftKey: true }, { deltaX: 100 }, { deltaY: 0 }])('respeta zoom y gestos nativos: %s', overrides => {
    const { nav, wheel } = fixture(); expect(wheel(overrides).preventDefault).not.toHaveBeenCalled(); expect(nav.scrollLeft).toBe(0);
  });
  it('normaliza deltas de lineas y paginas', () => {
    const { nav, wheel } = fixture(); wheel({ deltaY: 2, deltaMode: 1 }); expect(nav.scrollLeft).toBe(32);
    wheel({ deltaY: 1, deltaMode: 2 }); expect(nav.scrollLeft).toBe(300);
  });
  it('arrastrar con raton no selecciona la pildora al soltar', () => {
    const { nav, listeners } = fixture();
    listeners.pointerdown({ pointerType: 'mouse', button: 0, pointerId: 1, clientX: 100 });
    listeners.pointermove({ pointerId: 1, clientX: 50, preventDefault: vi.fn() });
    expect(nav.scrollLeft).toBe(50);
    listeners.pointerup({ pointerId: 1 });
    const click = { detail: 1, preventDefault: vi.fn(), stopPropagation: vi.fn() };
    listeners.click(click); expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(nav.setPointerCapture).toHaveBeenCalledWith(1);
  });
  it('preserva toque nativo y clics normales o de teclado', () => {
    const { nav, listeners } = fixture();
    listeners.pointerdown({ pointerType: 'touch', button: 0, pointerId: 1, clientX: 100 });
    listeners.pointermove({ pointerId: 1, clientX: 50, preventDefault: vi.fn() }); expect(nav.scrollLeft).toBe(0);
    const click = { detail: 0, preventDefault: vi.fn() }; listeners.click(click); expect(click.preventDefault).not.toHaveBeenCalled();
  });
  it('revela la activa desplazando solo el contenedor, sin scrollIntoView', () => {
    const { nav } = fixture(); nav.querySelector = () => ({ getBoundingClientRect: () => ({ left: 310, right: 400 }) });
    revealActivePill(nav); expect(nav.scrollLeft).toBe(104);
  });
  it('limpia listeners, captura y observador', () => {
    const disconnect = vi.fn(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
    const { nav, stop } = fixture(); stop(); expect(disconnect).toHaveBeenCalledOnce(); expect(nav.removeEventListener).toHaveBeenCalledTimes(8);
  });
  it('integra revelado, cambio de seccion y alineacion segura sin snap', () => {
    const js = readFileSync('app/cliente/cliente-experience.js', 'utf8'), css = readFileSync('app/cliente/cliente-experience.module.css', 'utf8');
    expect(js).toContain('ref={navRef}'); expect(js).toContain('previousTab.current !== activeTab');
    expect(js).toContain('window.scrollTo({ top: 0, behavior: "instant" })');
    expect(js).toContain('{navigationTab === id ? <span>{label}</span> : null}');
    expect(css).toContain('justify-content: safe center'); expect(css).not.toContain('scroll-snap-type: x proximity');
  });
});
