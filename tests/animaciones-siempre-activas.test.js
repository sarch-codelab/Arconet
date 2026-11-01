import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Las animaciones del sitio van SIEMPRE encendidas.
//
// Antes había 22 bloques @media (prefers-reduced-motion: reduce) y cuatro
// comprobaciones equivalentes en JS. En un equipo con "Efectos de animación"
// desactivado (Windows) o "Reducir movimiento" activo (macOS/iOS/Android),
// esas reglas dejaban el sitio a medio pintar: pasaban las animaciones a
// 0.01ms, de modo que un elemento que arranca en opacity: 0 / translateY(110%)
// se quedaba así, y los títulos se marcaban "listos" en el mismo render sin
// llegar a animarse. Se midió en el navegador con reducedMotion: "reduce":
// de 33 elementos con revelado, había 2 animaciones y el hero salía sin texto.

const CSS = globSync("app/**/*.css", { cwd: process.cwd() }).map((f) => [f, readFileSync(f, "utf8")]);
const JS = globSync("app/**/*.js", { cwd: process.cwd() }).map((f) => [f, readFileSync(f, "utf8")]);

describe("las animaciones no se apagan con el ajuste del sistema", () => {
  it("ningún CSS las desactiva por prefers-reduced-motion", () => {
    const conBloque = CSS.filter(([, texto]) => texto.includes("prefers-reduced-motion")).map(([f]) => f);
    expect(conBloque).toEqual([]);
  });

  it("los revelados no se saltan la animación", () => {
    // home-experience marcaba los títulos como "listos" en el mismo render con
    // `reduce`: el navegador los pintaba en su sitio y la cascada no se veía.
    const home = JS.find(([f]) => f === "app/home-experience.js")[1];
    expect(home).not.toContain("prefers-reduced-motion");
    expect(home).toContain("new IntersectionObserver(");
    expect(home).not.toMatch(/if \(reducido\)/);
  });

  it("el desplazamiento suave no se convierte en salto", () => {
    const footer = JS.find(([f]) => f === "app/footer.js")[1];
    expect(footer).toContain('behavior: "smooth"');
    expect(footer).not.toContain("prefers-reduced-motion");
    const topbar = JS.find(([f]) => f === "app/admin/topbar.js")[1];
    expect(topbar).toContain('behavior: "smooth"');
    expect(topbar).not.toContain("prefers-reduced-motion");
  });

  it("el arrastre del ratón en el panel no es una animación y se conserva", () => {
    // enableDragScroll no es movimiento decorativo: es una forma de desplazar
    // una tabla ancha. Ahí la preferencia sí se respeta a propósito.
    const drag = JS.find(([f]) => f === "app/admin/drag-scroll.js")[1];
    expect(drag).toContain("prefersReducedMotion");
  });
});

describe("el diseño no depende de una animación para verse", () => {
  it("las palabras del revelado arrancan ocultas y terminan visibles", () => {
    const css = readFileSync("app/page.module.css", "utf8");
    const interior = css.match(/\.palabraInterior\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(interior).toMatch(/transform:\s*translateY\(110%\)/);
    expect(interior).toMatch(/opacity:\s*0/);
    // El estado final debe existir y no depender de ningún @media.
    expect(css).toMatch(/\.palabrasListas\s+\.palabraInterior\s*\{[^}]*transform:\s*translateY\(0\)/);
    expect(css).toMatch(/\.palabrasListas\s+\.palabraInterior\s*\{[^}]*opacity:\s*1/);
  });

  it("un elemento con reveal acaba visible con su animación completa", () => {
    const css = readFileSync("app/page.module.css", "utf8");
    const home = readFileSync("app/home-experience.js", "utf8");
    // El revelado no oculta nada por CSS: solo añade `.revealVisible`, que
    // dispara `revealUp` con `both` (arranca oculto y termina visible). Por eso
    // forzar animation-duration a 0.01ms lo dejaba sin pintar.
    expect(css).toMatch(/\.revealVisible\s*\{[^}]*animation:\s*revealUp/);
    const anim = css.match(/@keyframes\s+revealUp\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(anim).toMatch(/opacity:\s*1/);
    // Sin IntersectionObserver se aplica ya, para no quedarse a medias.
    expect(home).toMatch(/typeof IntersectionObserver === "undefined"[\s\S]{0,160}revealVisible/);
  });
});
