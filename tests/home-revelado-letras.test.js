import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");
const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");

describe("revelado tipográfico de títulos", () => {
  it("se aplica a los títulos principales y al de categorías", () => {
    const marcas = casa.match(/data-split/g)?.length ?? 0;
    expect(marcas).toBeGreaterThanOrEqual(9);
  });

  it("respeta los elementos anidados para no perder el estilo de la 2ª línea", () => {
    // Si se usara textContent se borrarían los <em> y su color azul.
    expect(casa).not.toMatch(/titulo\.textContent = ""/);
    expect(casa).toContain("padre.replaceChild(fragmento, nodo)");
    expect(casa).toContain('nodo.tagName === "BR"');
  });

  it("divide por palabras y no por letras", () => {
    expect(casa).toContain("split(/(\\s+)/)");
    expect(casa).toContain("styles.palabra");
    expect(casa).toContain("styles.palabraInterior");
  });

  it("la cascada tiene retraso acotado para que no se eternice", () => {
    expect(casa).toMatch(/Math\.min\(indice \* 45, 620\)|Math\.min\(indice \* 45, \d+\)/);
  });

  it("las letras se revelan siempre, también con las animaciones del sistema apagadas", () => {
    // Antes, con `reduce` los títulos se marcaban ya "listos" en el mismo
    // render: el navegador los pintaba en su posición final y la cascada no
    // se veía. Ahora el revelado depende solo del IntersectionObserver.
    // El interpolador de la pista de Soluciones consulta "reduce" para no
    // animar el transform, pero NO toca los revelados: se revisa solo el
    // bloque de los observadores, que es lo que esta regresión protege.
    const revelados = casa.slice(
      casa.indexOf('querySelectorAll("[data-reveal]")'),
      casa.indexOf("const goTo =")
    );
    expect(revelados).not.toContain("prefers-reduced-motion");
    expect(revelados).toContain("new IntersectionObserver(");
    expect(casa.match(/prefers-reduced-motion/g)).toHaveLength(1);
    expect(casa).toContain("reduced: () => reduced.matches");
    expect(casa).toContain("new IntersectionObserver(");
    expect(css).toMatch(/\.palabraInterior\s*\{[^}]*transform:\s*translateY\(110%\)/);
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(reduced).not.toMatch(/palabra|parrafo|revealUp/);
    expect(reduced).toContain("cardFadeIn");
  });

  it("la clase de activación existe suelta para que CSS Modules la exporte", () => {
    // Si solo aparece como ".palabrasListas .hijo", styles.palabrasListas es undefined.
    expect(css).toMatch(/^\.palabrasListas\s*\{/m);
  });

  it("cada palabra se revela con una máscara, sin mover el layout", () => {
    const ext = css.match(/\.palabra\s*\{[^}]*\}/)?.[0] ?? "";
    // inline y no inline-block: con inline-block el navegador deja de medir el
    // titular con su ancho real y lo parte en más líneas (de 2 pasaba a 4).
    expect(ext).toContain("display: inline;");
    expect(ext).not.toContain("display: inline-block");
    expect(css).toMatch(/\.palabraInterior\s*\{[^}]*translateY\(110%\)/);
  });

  it("los párrafos de entrada se revelan después de su título", () => {
    expect(css).toMatch(/\.parrafoEntrada\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.parrafoEntrada\s*\{[^}]*transition-delay/);
    expect(casa).toContain("parrafoEntradaVisible");
    expect(casa).not.toMatch(/palabrasListas"[^;]*parrafo/);
  });
});

describe("menú 1: el panel de Soluciones no se descuadra", () => {
  it("el panel vive fuera del hero para que fixed use la ventana", () => {
    // El ancestro con transform/animation haría que fixed se posicione
    // respecto a él y el panel saldría corrido.
    const main = casa.indexOf("<main className={styles.experience}>");
    // El marcado del panel, no la referencia al className dentro del handler.
    const panel = casa.indexOf("className={`${styles.cardMegaPanel}");
    const hero = casa.indexOf("<div className={styles.heroFrame}>");
    expect(main).toBeLessThan(panel);
    expect(panel).toBeLessThan(hero);
  });

  it("el heroFrame no deja el transform aplicado", () => {
    const frame = css.match(/\.heroFrame\s*\{[^}]*\}/)?.[0] ?? "";
    expect(frame).toContain("animation-fill-mode: none");
  });

  it("no queda una copia duplicada del panel", () => {
    expect(casa.match(/className=\{`\$\{styles\.cardMegaPanel\}/g)?.length).toBe(1);
    expect(casa.match(/role="menu"/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("los grupos entran escalonados al abrir el panel", () => {
    expect(css).toMatch(/\.cardMegaPanelOpen \.cardMegaGroup:nth-child\(1\)[\s\S]*?transition-delay/);
  });
});

describe("menú 1: defectos reales detectados en navegador", () => {
  it("el clic abre el menú en vez de cerrarlo", () => {
    // Con un toggle, mouseenter ya lo abría y el cliqueo lo cerraba en el
    // acto: parecía que el botón no hacía nada.
    expect(casa).toContain("onClick={(event) => abrirMenuHero(item, event.currentTarget)}");
    expect(casa).not.toContain("onClick={() => setHeroMenuOpen((open) => !open)}");
  });

  it("el panel se ancla al header y no al botón", () => {
    // El botón termina más arriba que el header; anclarlo a su bottom dejaba
    // el panel montado encima de la barra.
    expect(casa).toContain('trigger.closest("header")');
    expect(casa).toContain("base + 10");
  });

  it("se centra sobre el botón y no se sale de la pantalla", () => {
    // Centrar sobre toda la navegación sacaba el panel por la izquierda (el
    // clamp lo pegaba a x=16 y aun así quedaba cortado). Centrado sobre el
    // botón cabe siempre y queda donde el visitante está mirando.
    expect(casa).toContain("const centro = caja.left + caja.width / 2");
    expect(casa).toContain("Math.max(16, Math.min(centro - ancho / 2");
  });

  it("los cuatro grupos van en 2x2 y no estirados", () => {
    const grupos = css.match(/\.cardMegaGroups\s*\{[^}]*\}/)?.[0] ?? "";
    expect(grupos).toContain("repeat(2, minmax(0, 1fr))");
    expect(grupos).toContain("align-items: start");
  });

  it("el titular de contacto respeta sus dos líneas", () => {
    // Antes la rejilla le daba ~531px a 100px de fuente y lo partía en cuatro;
    // con dos columnas hubo que reservarle espacio. Ahora el texto ya no
    // comparte fila con la imagen (esa banda lleva el video de fondo), así que
    // ocupa todo el ancho y tiene de sobra para las dos líneas.
    const inner = css.match(/\.contactInner\s*\{[^}]*\}/)?.[0] ?? "";
    expect(inner).toContain("display: block");
    expect(inner).not.toContain("grid-template-columns");
    // El titular conserva su salto de línea explícito.
    expect(casa).toContain("Hagamos que<br />");
  });
});
