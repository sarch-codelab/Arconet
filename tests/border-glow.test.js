import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCardClass, isGlowCard } from "@/lib/card-glow-targets";
import { buildGlowVars, pointerGlowValues } from "@/components/ui/border-glow/border-glow-utils";
const read = path => readFileSync(path, "utf8");
describe("BorderGlow en todas las tarjetas", () => {
  it.each(['card', 'a1b_card', 'page-module__abc__valueCard', 'a1b_exampleCard', 'a1b_metric', 'a1b_profileStatCard', 'a1b_quoteInner'])('reconoce la superficie %s', token => {
    expect(isCardClass(token)).toBe(true);
  });
  it.each(['cards', 'a1b_cardHeader', 'a1b_cardBody', 'a1b_metricLabel', 'a1b_productList', 'a1b_cardsGrid', 'a1b_cardMeta'])('no confunde contenido o contenedores con tarjetas: %s', token => {
    expect(isCardClass(token)).toBe(false);
  });
  it('excluye nodos reemplazados y conserva opción de exclusión', () => {
    expect(isGlowCard({ namespaceURI: 'http://www.w3.org/1999/xhtml', tagName: 'IMG' })).toBe(false);
    expect(isGlowCard({ namespaceURI: 'http://www.w3.org/2000/svg' })).toBe(false);
    expect(isGlowCard({ namespaceURI: 'http://www.w3.org/1999/xhtml', tagName: 'DIV', closest: () => ({}) })).toBe(false);
  });
  it('calcula cercanía y dirección usando un rectángulo, sin lecturas de layout adicionales', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 };
    expect(pointerGlowValues(rect, 110, 70).proximity).toBe(0);
    expect(pointerGlowValues(rect, 210, 70)).toEqual({ proximity: 100, angle: 90 });
    expect(pointerGlowValues(rect, 110, 20)).toEqual({ proximity: 100, angle: 0 });
    expect(pointerGlowValues({ ...rect, width: 0 }, 0, 0).proximity).toBe(0);
  });
  it('genera gradientes y limita parámetros fuera de rango sin dividir entre cero', () => {
    const vars = buildGlowVars({ edgeSensitivity: 100, glowIntensity: 20, colors: [] });
    expect(vars['--bg-edge-sensitivity']).toBe(99);
    expect(vars['--bg-glow-100']).toContain('/ 100%');
    expect(vars['--bg-gradient-one']).toContain('radial-gradient');
    expect(Object.values(vars).join()).not.toMatch(/undefined|NaN|Infinity/);
  });
  it('se monta globalmente, detecta tarjetas dinámicas y conserva contenido y teclado', () => {
    expect(read('app/layout.js')).toContain('<SiteBorderGlow />');
    const source = read('app/site-border-glow.js');
    expect(source).toContain('new MutationObserver');
    expect(source).toContain('record.addedNodes.forEach(scan)');
    expect(source).toContain('requestAnimationFrame(draw)');
    expect(source).toContain('fillOpacity: 0');
    expect(source).toContain('document.addEventListener("focusin", focus)');
    expect(source).toContain('observer.disconnect()');
    expect(source).toContain('cards.delete(card)');
    const css = read('components/ui/border-glow/border-glow.css');
    expect(css).toContain('pointer-events: none');
    expect(css).toContain('mask-composite: exclude');
    expect(css).not.toContain('transform:');
    expect(read('components/ui/border-glow/border-glow-utils.js')).toContain("layer.setAttribute('aria-hidden', 'true')");
  });
});
