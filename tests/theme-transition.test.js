import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateThemeChange, cancelThemeTransition, circleThemeClipPaths } from '@/lib/theme-transition';
import { readFileSync } from 'node:fs';
afterEach(() => { cancelThemeTransition(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function setup(reduced = false) {
  const root = { dataset: {}, style: { setProperty: vi.fn(), removeProperty: vi.fn() }, animate: vi.fn(() => ({ cancel: vi.fn() })) };
  const doc = { documentElement: root, getAnimations: () => [] };
  vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800 });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  return { doc, root };
}
describe('Cambio animado de tema', () => {
  it('calcula origen y radio en porcentajes para escalas de pantalla fraccionarias', () => {
    const clips = circleThemeClipPaths(200, 400, 1000, 800);
    expect(clips[0]).toBe('circle(0% at 20% 50%)');
    expect(clips[1]).toContain('at 20% 50%');
    expect(clips.join()).not.toContain('px');
  });
  it.each([true, false])('aplica sin View Transitions cuando reduce=%s o falta la API', async reduced => {
    setup(reduced); const apply = vi.fn();
    expect(await animateThemeChange(null, apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
  });
  it('revela desde el control y limpia estilo y bloqueo tras terminar', async () => {
    const { doc, root } = setup(); const apply = vi.fn(); let finish;
    doc.startViewTransition = callback => { callback(); return { ready: Promise.resolve(), finished: new Promise(resolve => { finish = resolve; }) }; };
    const result = animateThemeChange({ getBoundingClientRect: () => ({ left: 190, top: 390, width: 20, height: 20 }) }, apply);
    expect(await animateThemeChange(null, vi.fn())).toBe(false);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(root.animate).toHaveBeenCalledWith({ clipPath: expect.arrayContaining(['circle(0% at 20% 50%)']) }, expect.objectContaining({ pseudoElement: '::view-transition-new(root)', duration: 400 }));
    finish(); expect(await result).toBe(true);
    expect(root.dataset.arconetThemeVt).toBeUndefined();
    expect(apply).toHaveBeenCalledOnce();
  });
  it('aplica una vez si la API falla antes del callback y libera el estado', async () => {
    const { doc, root } = setup(); const apply = vi.fn();
    doc.startViewTransition = () => { throw new Error('not available'); };
    expect(await animateThemeChange(null, apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce(); expect(root.dataset.arconetThemeVt).toBeUndefined();
  });
  it('cancelar desbloquea incluso una API que no resuelve ready/finished', async () => {
    const { doc, root } = setup(); const apply = vi.fn(); const skip = vi.fn();
    doc.startViewTransition = () => ({ ready: new Promise(() => {}), finished: new Promise(() => {}), skipTransition: skip });
    const result = animateThemeChange(null, apply); cancelThemeTransition();
    expect(await result).toBe(false); expect(skip).toHaveBeenCalledOnce();
    expect(root.dataset.arconetThemeVt).toBeUndefined(); expect(apply).not.toHaveBeenCalled();
  });
  it('limita las reglas CSS al cambio de tema y conserva los controles existentes', () => {
    const css = readFileSync('app/globals.css','utf8');
    expect(css).toContain('html[data-arconet-theme-vt="active"]::view-transition-new(root)');
    expect(css).not.toMatch(/^::view-transition-old/m);
    expect(readFileSync('app/theme-toggle.js','utf8')).toContain('animateThemeChange(event?.currentTarget');
    expect(readFileSync('app/admin/admin-preferences.js','utf8')).toContain('animateThemeChange(origin');
  });
});
