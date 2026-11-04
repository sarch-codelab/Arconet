import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const home = readFileSync("app/home-experience.js", "utf8");
const wrapper = readFileSync("app/home-warp-quote.js", "utf8");
const source = readFileSync("components/ui/warp-text/warp-text.js", "utf8");
const css = readFileSync("components/ui/warp-text/warp-text.css", "utf8");
describe("WarpText progresivo en la cita de inicio", () => {
  it("conserva la cita, su entrada y todos los títulos animados", () => {
    expect(home).toContain('<blockquote className={styles.quoteInner} data-reveal>');
    expect(home).toContain('<p><HomeWarpQuote /></p>');
    expect(home).toContain('<h2 data-split>Hagamos que<br /><em>todo conecte.</em></h2>');
    expect(wrapper).toContain('No vendemos solo equipo: ayudamos a que cada conexión funcione.');
    expect(wrapper).toContain('intro={false}');
  });
  it("difiere OGL hasta acercarse a la cita y mantiene texto SSR sin GPU", () => {
    expect(wrapper).toContain('IntersectionObserver');
    expect(wrapper).toContain('ssr: false');
    expect(wrapper).toContain(': HOME_QUOTE');
    expect(source).toContain('className="warp-text__fallback"');
    expect(source).toContain('aria-label={text}');
    expect(css).toContain('visibility: hidden');
    expect(css).not.toContain('min-height: 220px');
  });
  it("reduce sin apagar, limita DPR/fps y pausa fuera de vista y con página oculta", () => {
    expect(source).toContain('reduceMotion ? 0.25 : 1');
    expect(source).toContain('reduceMotion ? 80 : 33');
    expect(source).toContain('reduceMotion ? 0.3 : 1');
    expect(source).toContain('Math.min(window.devicePixelRatio || 1, 1.5)');
    expect(source).toContain('pageVisible = !document.hidden');
    expect(source).toContain('visible = entry.isIntersecting');
    expect(source).toContain('themeObserver.disconnect()');
    expect(source).toContain('gl.deleteTexture');
    expect(source).toContain('geometry?.remove');
    expect(source).toContain('program?.remove');
    expect(source).not.toContain('smoothstep(radius, 0.0, dist)');
  });
});
