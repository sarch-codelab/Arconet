import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGrid } from '@/components/ui/flickering-grid/flickering-grid';
import { hasBackgroundImage } from '@/app/site-flickering-grid';
const read = path => readFileSync(path, 'utf8');
afterEach(() => vi.unstubAllGlobals());
describe('Flickering Grid global', () => {
  it('detecta imágenes propias y de pseudoelementos, sin tratar gradientes como fotografías', () => {
    vi.stubGlobal('getComputedStyle', (_node, pseudo) => ({ backgroundImage: pseudo === '::before' ? 'url("photo.webp")' : 'none' }));
    expect(hasBackgroundImage({})).toBe(true);
    vi.stubGlobal('getComputedStyle', () => ({ backgroundImage: 'linear-gradient(black, white)' }));
    expect(hasBackgroundImage({})).toBe(false);
  });
  it('limita el canvas a una porción de pantalla y restaura estilos al limpiar', () => {
    const ctx = { clearRect: vi.fn(), fillRect: vi.fn() };
    const canvas = { style: {}, setAttribute: vi.fn(), getContext: () => ctx, remove: vi.fn() };
    vi.stubGlobal('document', { createElement: () => canvas });
    vi.stubGlobal('getComputedStyle', () => ({ position: 'relative' }));
    vi.stubGlobal('innerHeight', 800);
    const style = { getPropertyValue: key => key === 'isolation' ? 'auto' : '', getPropertyPriority: () => '', setProperty: vi.fn(), removeProperty: vi.fn() };
    const host = { style, appendChild: vi.fn(), getBoundingClientRect: () => ({ width: 2000, height: 50000, top: -4000 }) };
    const grid = createGrid(host);
    grid.draw(.1, false, true);
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(832);
    expect(canvas.style.transform).toBe('translateY(4000px)');
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(canvas.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
    grid.remove();
    expect(canvas.remove).toHaveBeenCalledOnce();
    expect(style.setProperty).toHaveBeenCalledWith('isolation', 'auto', '');
  });
  it('usa un solo bucle limitado, pausa fuera de vista y oculta decoración en impresión', () => {
    const source = read('app/site-flickering-grid.js');
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('document.hidden');
    expect(source).toContain('reduced.matches ? 500 : 66');
    expect(source).toContain('cancelAnimationFrame(frame)');
    expect(source).toContain("addEventListener('scroll', onScroll");
    expect(source).toContain('scrolling || !visible.size');
    expect(source).toContain('observer.disconnect()');
    expect(source).toContain('hasBackgroundImage(ancestor)');
    expect(read('components/ui/flickering-grid/flickering-grid.css')).toContain('pointer-events: none');
    expect(read('components/ui/flickering-grid/flickering-grid.css')).toContain('forced-colors');
  });
  it('retira el cursor y excluye explícitamente el cuadro de Monica del glow', () => {
    const layout = read('app/layout.js');
    expect(layout).not.toContain('SiteTargetCursor');
    expect(layout).toContain('<SiteFlickeringGrid />');
    expect(read('app/admin/ia-section.js')).toContain('data-border-glow="off"');
    expect(read('app/admin/admin-experience.js')).toContain('data-flickering-grid="on"');
  });
});
