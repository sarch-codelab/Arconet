import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = path => readFileSync(new URL(`../app/admin/${path}`, import.meta.url), 'utf8');

/**
 * Regresión del desplazamiento de las píldoras del panel.
 *
 * Las filas de píldoras desbordan en anchos de ventana corrientes (1366 px
 * deja fuera parte de la última, y en tableta/celular falta casi la mitad).
 * Con el dedo se podían deslizar, pero con mouse no: la rueda movía la página
 * y arrastrar no hacía nada, así que las píldoras de la derecha quedaban
 * inalcanzables.
 */
describe('desplazamiento de las píldoras con mouse', () => {
  const source = read('pill-scroll.js');

  it('convierte la rueda vertical en desplazamiento horizontal solo con desborde', () => {
    expect(source).toContain('scrollWidth - el.clientWidth');
    expect(source).toContain('event.deltaY * unit');
    expect(source).toContain('event.preventDefault()');
    // La rueda debe poder cancelar el desplazamiento de la página.
    expect(source).toContain('{ passive: false }');
  });

  it('libera la rueda en los extremos para que la página siga desplazándose', () => {
    expect(source).toContain('el.scrollLeft >= max - 1');
    expect(source).toContain('el.scrollLeft <= 1');
  });

  it('permite arrastrar con el botón principal sin disparar el clic de las píldoras', () => {
    expect(source).toContain('event.pointerType !== "mouse"');
    expect(source).toContain('event.button !== 0');
    expect(source).toContain('DRAG_THRESHOLD');
    expect(source).toContain('pillClickGuard');
    expect(source).toContain('event.stopPropagation()');
  });

  it('no intercepta dedo ni lápiz: el deslice nativo sigue intacto', () => {
    expect(source).toContain('event.pointerType && event.pointerType !== "mouse"');
    expect(source).toContain('"pointercancel"');
  });

  it('se conecta aunque la fila se monte después del primer render', () => {
    expect(source).toContain('const cleanupRef = useRef(null)');
    expect(source).toContain('cleanupRef.current = node ? attachPillScroll(node) : null');
    expect(source).toContain('cleanupRef.current?.()');
  });

  it('suspende los puntos de anclaje durante el gesto y los restaura', () => {
    expect(source).toContain('el.style.scrollSnapType = "none"');
    expect(source).toContain('el.style.scrollSnapType = ""');
  });

  it('retira todos los gestos al desmontar', () => {
    for (const listener of ['wheel', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(source).toContain(`removeEventListener("${listener}"`);
    }
  });
});

describe('filas de píldoras conectadas al gesto', () => {
  const topbar = read('topbar.js');
  const solicitudes = read('solicitudes-panel.js');
  const css = read('admin-experience.module.css');
  const solicitudesCss = read('solicitudes-panel.module.css');

  it('la cabecera aplica el gesto a las secciones y a las sub-píldoras', () => {
    expect(topbar).toContain('import { usePillScroll } from "./pill-scroll"');
    expect(topbar).toContain('const attachPillScroll = usePillScroll();');
    expect(topbar).toContain('attachPillScroll(node);');
    // Definición + las dos filas (cabecera y SectionTabs).
    expect(topbar.match(/useActivePillIntoView\(/g)?.length).toBe(3);
  });

  it('los filtros de órdenes internas usan la misma fila desplazable', () => {
    expect(solicitudes).toContain('const filtersRef = usePillScroll();');
    expect(solicitudes).toContain('ref={filtersRef}');
  });

  it.each([
    ['centerPillNav', css],
    ['sectionTabs', css],
    ['filterScroll', solicitudesCss],
  ])('%s marca el cursor al desbordar', (selector, sheet) => {
    expect(sheet).toContain(`[data-pill-overflow="true"]`);
    expect(sheet).toContain(`[data-pill-dragging="true"]`);
  });

  it('las filas siguen desplazándose en horizontal', () => {
    for (const selector of ['centerPillNav', 'sectionTabs']) {
      const block = css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))?.[1];
      expect(block).toMatch(/overflow-x:\s*auto/);
    }
  });

  it('los puntos de anclaje quedan para punteros gruesos', () => {
    for (const selector of ['centerPillNav', 'sectionTabs']) {
      const block = css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))?.[1];
      expect(block).not.toMatch(/scroll-snap-type/);
    }
    const coarse = css.match(/@media \(pointer: coarse\) \{([\s\S]*?)\n\}/)?.[1] || '';
    expect(coarse).toContain('.centerPillNav');
    expect(coarse).toContain('.sectionTabs');
    expect(coarse).toContain('scroll-snap-type: x proximity');
  });
});
