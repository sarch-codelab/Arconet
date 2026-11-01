import { readFileSync, statSync, existsSync, globSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La web se notaba lenta. Al medir en una build de producción, el problema no
// era el JavaScript (247 KB, sin tareas largas ni siquiera con la CPU 4 veces
// más lenta) sino los siguientes lastres:
//
//   1. El logo se pedía a 3840px (48 KB) para un hueco de 176px, porque el
//      `clamp()` del CSS impedía deducir el ancho. Y el PNG original (308 KB)
//      se precargaba en todas las páginas.
//   2. Un video en bucle se reproducía siempre, aunque no se estuviera mirando.
//   3. Siete PNG de hasta 3.9 MB (23.5 MB en total) seguían en public/ sin que
//      nadie los usara, y un .bak de 1400 líneas estaba versionado.
//
// Este archivo evita que vuelvan.

const raiz = process.cwd();
const APP = globSync("app/**/*.js", { cwd: raiz });
const CSS = globSync("app/**/*.css", { cwd: raiz });
const leer = (f) => readFileSync(f, "utf8");
const todosApp = APP.map(leer).join("\n");
const todosCss = CSS.map(leer).join("\n");

describe("el logo se sirve al tamaño que se ve", () => {
  it("todas las apariciones declaran `sizes`", () => {
    // Cada <Image src="/arconet.png"> debe decir cuánto ocupa, o Next elige
    // la variante mayor del srcSet.
    const apariciones = [...todosApp.matchAll(/<Image[\s\S]{0,300}?arconet\.png[\s\S]{0,300}?\/>/g)];
    expect(apariciones.length).toBeGreaterThan(5);
    const sinSizes = apariciones.filter((m) => !m[0].includes("sizes="));
    expect(sinSizes).toEqual([]);
  });

  it("el CSS del logo no usa clamp()", () => {
    // Un ancho variable impide acotar el srcSet: Next no puede saber el tamaño
    // final y descarga la variante más grande.
    expect(todosCss).not.toMatch(/\.brand img\s*\{[^}]*width:\s*clamp\(/);
    expect(todosCss).not.toMatch(/\.heroLogoImg\s*\{[^}]*width:\s*clamp\(/);
  });

  it("el PNG original ya no es la imagen inicial grande", () => {
    // Se recodificó a 1200x200 y quedó en ~113 KB (antes 308 KB a 2172x362).
    const peso = statSync("public/arconet.png").size;
    expect(peso).toBeLessThan(160 * 1024);
  });

  it("no se precarga el logo en todas las páginas", () => {
    // Ese preload competía por el ancho de banda con la foto del hero.
    expect(leer("app/layout.js")).not.toContain('rel="preload" as="image" href="/arconet.png"');
  });
});

describe("no quedan archivos muertos en public/", () => {
  const sinUso = [
    "public/neto-manana.png",
    "public/neto-tarde.png",
    "public/neto-noche.png",
    "public/neto-servicio-cliente.png",
    "public/neto-pensando.png",
    "public/linea-1.png",
    "public/linea-2.png",
  ];

  it("las imágenes que nadie usaba están fuera", () => {
    const presentes = sinUso.filter((f) => existsSync(f));
    expect(presentes).toEqual([]);
  });

  it("no hay copias de respaldo versionadas", () => {
    expect(globSync("app/**/*.bak", { cwd: raiz })).toEqual([]);
  });

  it("no queda la lista de imágenes por hora del hero", () => {
    // TIME_IMAGES apuntaba a tres PNG de 1.6–3.9 MB que el hero ya no pinta.
    expect(leer("app/home-experience.js")).not.toContain("TIME_IMAGES");
  });
});

describe("las imágenes grandes piden la variante de su tamaño", () => {
  it("la foto de contacto declara sizes y carga diferida", () => {
    const contacto = leer("app/contacto/contact-experience.js");
    const img = contacto.match(/<Image[\s\S]{0,400}?neto-conducioendo\.png[\s\S]{0,400}?\/>/)?.[0] ?? "";
    expect(img).toContain("sizes=");
    expect(img).toContain('loading="lazy"');
  });

  it("la foto del hero mantiene su prioridad", () => {
    // Es la imagen que se ve al entrar: ahí `priority` sí está bien puesto.
    const home = leer("app/home-experience.js");
    expect(home).toMatch(/src="\/empresa\.webp"[\s\S]{0,200}?priority/);
  });
});
