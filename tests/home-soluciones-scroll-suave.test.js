import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (ruta) => readFileSync(ruta, "utf8");
const home = leer("app/home-experience.js");
const css = leer("app/page.module.css");
const grid = leer("app/site-flickering-grid.js");
const easing = leer("lib/slide-easing.js");
const nativo = leer("lib/native-scroll.js");

// Bloque que corre en cada evento de scroll agrupado por RAF.
const inicio = home.indexOf("const updateScrollEffects =");
const bloque = home.slice(inicio, home.indexOf("const scrollController =", inicio));

describe("regresión: las cuatro imágenes se deslizan con el scroll sin tirones", () => {
  it("sigue ligada al scroll nativo, sin interceptar rueda ni touch", () => {
    expect(home).toContain("observeNativeScroll(updateScrollEffects");
    expect(home).toContain("createSlideEasing");
    expect(nativo).not.toMatch(/addEventListener\(["'](?:wheel|touchmove|keydown)/);
    expect(bloque).not.toContain("preventDefault");
    expect(bloque).toContain("moverPista(progress)");
  });

  it("no publica una custom property heredada en el section en cada fotograma", () => {
    expect(home).not.toContain('setProperty("--slide-progress"');
    expect(home).toContain("track.style.transform = `translate3d(");
    expect(css).not.toMatch(/^\s*--slide-progress:/m);
    expect(bloque).not.toContain("stage.style");
  });

  it("escribe el zoom en la foto, no en el hero completo", () => {
    expect(home).toContain('ref={heroMediaRef} className={styles.heroBgMedia}');
    expect(home).toContain('heroMedia.style.setProperty("--zoom-progress"');
    expect(home).not.toContain('hero.style.setProperty("--zoom-progress"');
  });

  it("interpola con un bucle corto que se apaga en reposo", () => {
    expect(easing).toContain("if (actual !== objetivo) handle = requestFrame(step)");
    expect(easing).not.toContain("setInterval");
    expect(easing).toContain("reduced() || hidden()");
    expect(home).toContain('reduced: () => reduced.matches');
    expect(home).toContain("easing.stop()");
  });

  it("la altura de 400svh se renderiza en el servidor: sin salto al hidratar", () => {
    expect(home).toContain("`${styles.solutionsStage} ${styles.scrollReady}`");
    expect(home).not.toContain("setScrollReady");
    expect(home).not.toContain("const [scrollReady");
    expect(css).toMatch(/\.scrollReady\.solutionsStage\s*\{[^}]*height:\s*400svh/);
  });

  it("respeta el carrusel horizontal nativo en móvil", () => {
    expect(home).toContain("if (mobile) {");
    expect(home).toContain('track?.style.removeProperty("transform")');
    expect(home).toContain("easing.reset()");
    expect(bloque).toContain("if (!mobile) moverPista(progress)");
    expect(css).toMatch(/\.solutionTrack, \.scrollReady \.solutionTrack\s*\{[^}]*transform: none/);
  });

  it("mantiene los puntos y encabezados alineados con el panel visible", () => {
    expect(bloque).toContain("Math.round(progress * (SOLUTIONS.length - 1))");
    expect(home).toContain("hidden={activeSlide !== index}");
    expect(home).toContain("const onTrackScroll = () =>");
  });

  it("no repinta un backdrop-filter ni promueve la pista a capa permanente", () => {
    const visual = css.match(/\.solutionPanel\.brandPanel \.solutionVisual\s*\{([^}]*)\}/)?.[1] || "";
    expect(visual.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("backdrop-filter");
    const pista = css.match(/\.scrollReady \.solutionTrack\s*\{([^}]*)\}/)?.[1] || "";
    expect(pista.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("will-change");
  });

  it("suspende los lienzos decorativos mientras se desplaza la página", () => {
    expect(grid).toContain("scrolling = true");
    expect(grid).toContain("addEventListener('scroll', onScroll");
    expect(grid).toContain("cancelAnimationFrame(frame); frame = 0");
    expect(grid).toContain("clearTimeout(idleTimer)");
    expect(grid).toContain("removeEventListener('scroll', onScroll, true)");
    expect(grid).toContain("if (document.hidden || scrolling || !visible.size) return");
  });
});
