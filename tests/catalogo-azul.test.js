import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (ruta) => readFileSync(ruta, "utf8");
const CSS = "app/catalogo/catalogo-experience.module.css";
const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const DATOS = "app/catalogo/vitrina-data.js";
const DOCS = "docs/catalogo-vitrina.md";
const HERO = "public/catalogo-vitrina/hero-banner.jpg";

const fuentes = [CSS, EXPERIENCIA, DATOS].map(leer).join("\n");

describe("/catalogo usa el azul de Arconet, no el rojo de la referencia", () => {
  it("no queda ningún color rojo en la vitrina", () => {
    for (const rojo of ["#e11b22", "#bd151b", "rgba(225, 27, 34", "rgb(225, 27, 34"]) {
      expect(fuentes, rojo).not.toContain(rojo);
    }
    expect(fuentes.toLowerCase()).not.toMatch(/panel rojo|acento rojo|tarjeta roja/);
  });

  it("el acento es el mismo azul de marca de home y /tienda", () => {
    const css = leer(CSS);
    expect(css).toContain("--accent: #1544b5;");
    expect(css).toContain("--accent-dark: #11358f;");
    expect(css).toContain("--accent-ink: #1544b5;");
    expect(css).toMatch(/\.dealsPromo\s*\{[^}]*background: var\(--accent\)/);
    expect(leer("app/page.module.css")).toContain("--blue: #1544b5;");
    expect(leer("app/tienda/catalogo-experience.module.css")).toContain("--blue: #1544b5;");
  });

  it("en modo oscuro la tinta se aclara para mantener el contraste del texto", () => {
    const css = leer(CSS);
    const bloque = css.match(/:global\(html\[data-theme="dark"\]\) \.page\s*\{([^}]*)\}/)?.[1] || "";
    expect(bloque).toContain("--accent-ink: #7fa6ff;");
    expect(bloque).toContain("--accent-ink-hover: #a9c4ff;");
    // Los fondos/botones siguen siendo el azul saturado: texto blanco legible.
    expect(bloque).not.toContain("--accent:");
    // El texto y los iconos sobre la superficie oscura usan la tinta clara.
    expect(css).toMatch(/\.sectionEyebrow\s*\{[^}]*color: var\(--accent-ink\)/);
    expect(css).toMatch(/\.benefitIcon\s*\{[^}]*color: var\(--accent-ink\)/);
    expect(css).toMatch(/\.promiseIcon\s*\{[^}]*border: 1\.5px solid var\(--accent-ink\)/);
  });

  it("los textos sobre fondo blanco conservan el azul saturado", () => {
    const css = leer(CSS);
    // La tarjeta de ofertas conserva el azul saturado como tinte sobre la foto.
    expect(css).toMatch(/\.dealsCard \.categoryTint\s*\{[^}]*var\(--accent\)/);
    const gift = css.match(/\.giftIcon\s*\{([^}]*)\}/)?.[1] || "";
    const boton = css.match(/\.dealsButton\s*\{([^}]*)\}/)?.[1] || "";
    expect(gift).toContain("background: #fff;");
    // El medallón ya no pinta un icono con `color`: muestra la imagen 3D.
    expect(css).toMatch(/\.giftImg\s*\{[^}]*object-fit: contain/);
    expect(boton).toContain("background: #fff;");
    expect(boton).toContain("color: var(--accent);");
  });

  it("el comentario del hero y la documentación hablan de azul", () => {
    expect(leer(EXPERIENCIA)).toContain("panel azul en diagonal");
    const docs = leer(DOCS);
    expect(docs).toContain("#1544b5");
    expect(docs).toContain("panel azul diagonal");
    expect(docs).toContain("medidor naranja");
  });

  it("la foto del hero sigue siendo un JPEG válido del tamaño esperado", () => {
    const bytes = readFileSync(HERO);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    expect(statSync(HERO).size).toBeGreaterThan(1000);
    // Lee el marcador SOF para comprobar las dimensiones sin decodificar.
    let ancho = 0, alto = 0;
    for (let i = 2; i < bytes.length - 9; i += 1) {
      if (bytes[i] !== 0xff) continue;
      const marca = bytes[i + 1];
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        alto = bytes.readUInt16BE(i + 5);
        ancho = bytes.readUInt16BE(i + 7);
        break;
      }
    }
    expect([ancho, alto]).toEqual([1584, 672]);
  });
});
