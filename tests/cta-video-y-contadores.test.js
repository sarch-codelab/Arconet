import { readFileSync, existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Dos cambios de la home:
//   1. Las cifras de "Arconet en números" cuentan de 0 al valor al entrar en
//      pantalla, desacelerando al final.
//   2. Las bandas "Hagamos que todo conecte" llevan el video de cintas de
//      fondo, en lugar de la foto fija y del personaje Neto.

const CONTADOR = "app/contador-cifra.js";
const VIDEO = "app/video-fondo-cta.js";
const VIDEO_CSS = "app/video-fondo-cta.module.css";
const HOME = "app/home-experience.js";
const HOME_CSS = "app/page.module.css";
const CATALOGO = "app/tienda/catalogo-experience.js";

const leer = (f) => readFileSync(f, "utf8");

describe("las cifras cuentan de cero al valor", () => {
  const contador = leer(CONTADOR);

  it("arranca en 0 y llega al valor", () => {
    expect(contador).toContain("setActual(0)");
    expect(contador).toContain("partes.numero * curva(t)");
    // Se detiene al llegar, no sigue en bucle.
    expect(contador).toMatch(/if \(t < 1\) cuadro = requestAnimationFrame\(paso\)/);
  });

  it("desacelera al final", () => {
    // La curva cúbica es la que frena: 1 - (1-t)^3. Con una lineal el número
    // llegaría a toda velocidad y no se leería.
    expect(contador).toMatch(/1 - Math\.pow\(1 - Math\.min\(1, Math\.max\(0, t\)\), 3\)/);
  });

  it("el reloj arranca al entrar en pantalla, no al montar", () => {
    // Si `inicio` se fijara al montar el componente, cuando la banda entra en
    // la ventana el tiempo ya habría pasado y el número saltaría al final.
    expect(contador).toMatch(/const lanzar = \(\) => \{[\s\S]{0,400}performance\.now\(\)/);
    expect(contador).toContain("new IntersectionObserver");
    // La cuenta se dispara una sola vez, aunque vuelva a entrar en pantalla.
    expect(contador).toContain("unobserve");
  });

  it("no muestra números negativos en el primer cuadro", () => {
    // requestAnimationFrame puede entregar una marca anterior a `inicio`.
    expect(contador).toMatch(/Math\.max\(0, \(ahora - inicio\) \/ DURACION\)/);
  });

  it("conserva el prefijo y el sufijo de la cifra", () => {
    // "+10" debe seguir siendo "+10" y "100%" debe seguir siendo "100%".
    expect(contador).toMatch(/\$\{partes\.prefijo\}/);
    expect(contador).toMatch(/\$\{partes\.sufijo\}/);
    // La cifra final es la que lee un lector de pantalla.
    expect(contador).toContain("aria-label={partes.texto}");
  });

  it("la banda de la home usa el contador", () => {
    const home = leer(HOME);
    expect(home).toContain('import ContadorCifra from "./contador-cifra"');
    expect(home).toMatch(/<ContadorCifra valor=\{stat\.value\}/);
    // Las cinco cifras siguen siendo las mismas.
    expect(home).toContain('{ value: "+10", label: "Años conectando Honduras" }');
    expect(home).toContain('{ value: "5", label: "Líneas de producto especializadas" }');
    expect(home).toContain('{ value: "18", label: "Departamentos con cobertura" }');
    expect(home).toContain('{ value: "2", label: "Sedes: San Pedro Sula y Tegucigalpa" }');
    expect(home).toContain('{ value: "100%", label: "Calidad y garantía respaldada" }');
  });
});

describe("el video de fondo de las bandas de contacto", () => {
  it("el archivo existe y pesa poco", () => {
    const ruta = "public/lines-fondo.mp4";
    expect(existsSync(ruta)).toBe(true);
    // El original es 4K y pesa 7.9 MB; para la web se recodificó a 1080p.
    expect(statSync(ruta).size).toBeLessThan(600 * 1024);
    expect(existsSync("public/lines-poster.jpg")).toBe(true);
  });

  it("es decorativo: silenciado, en bucle y sin controles", () => {
    const video = leer(VIDEO);
    expect(video).toContain("muted");
    expect(video).toContain("loop");
    expect(video).toContain("playsInline");
    expect(video).toContain("autoPlay");
    expect(video).toContain('aria-hidden="true"');
    expect(video).toContain("controls={false}");
    // La fuente es condicional: con ahorro de datos no se descarga el video.
    expect(video).toContain("src = VIDEO");
    expect(video).toContain("poster = POSTER");
    expect(video).toContain("ahorro ? undefined : src");
    // Si el navegador rechaza el autoplay, se ignora en vez de romper.
    expect(video).toMatch(/intento\.catch\(\(\) => \{\}\)/);
  });

  it("no gasta recursos cuando nadie lo mira", () => {
    const video = leer(VIDEO);
    // Un video en bucle reproduce 30 fotogramas por segundo para siempre: se
    // pausa al salir de pantalla y se reanuda al volver a la pestaña.
    expect(video).toContain("new IntersectionObserver");
    expect(video).toMatch(/else reproductor\.pause\(\)/);
    expect(video).toContain('document.addEventListener("visibilitychange", alVolver)');
    // Con ahorro de datos se queda el póster y no se pide el archivo.
    expect(video).toContain("saveData");
    expect(video).toContain("prefers-reduced-data");
    expect(video).toContain('preload={ahorro ? "none" : "metadata"}');
  });

  it("va detrás del contenido, nunca encima", () => {
    const css = leer(VIDEO_CSS);
    const fondo = css.match(/\.fondo\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    // Con z-index 0, montado dentro de un contenedor relativo, se pintaba por
    // encima del texto (que no tiene z-index propio) y lo tapaba.
    expect(fondo).toContain("z-index: -1");
    expect(fondo).toContain("pointer-events: none");
    expect(fondo).toContain("position: absolute");
  });

  it("oscurece donde hay texto y deja ver las cintas", () => {
    const css = leer(VIDEO_CSS);
    const velo = css.match(/\.velo\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const alfas = [...velo.matchAll(/rgba\([^)]*?([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(alfas.length).toBeGreaterThan(1);
    // Arriba a la izquierda, donde va el texto, casi opaco.
    expect(alfas[0]).toBeGreaterThanOrEqual(0.8);
    // A la derecha se aclara para que se vean las cintas.
    expect(alfas[alfas.length - 1]).toBeLessThan(0.5);
  });

  it("sustituye a la foto fija y a Neto en la home y en el catálogo", () => {
    const home = leer(HOME);
    const catalogo = leer(CATALOGO);
    // Neto ya no aparece en esa banda.
    expect(home).not.toContain("neto-servicio-cliente");
    expect(catalogo).not.toContain("neto-servicio-cliente");
    // El video se monta una vez en cada banda.
    expect(home).toContain("<VideoFondoCTA />");
    expect(catalogo).toContain("<VideoFondoCTA />");
    // La foto que había de fondo en la home se retira.
    const css = leer(HOME_CSS);
    const seccion = css.match(/\.contactSection\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(seccion).not.toContain("hero-fiber.jpg");
  });
});
