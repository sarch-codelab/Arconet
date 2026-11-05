import { globSync } from "node:fs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Chrome avisaba "The resource <URL> was preloaded using link preload but not
// used within a few seconds". Había dos fuentes de preloads huérfanos:
//
//   1. Cada <Image priority> emite <link rel="preload" as="image">. Nueve
//      vistas tenían el hero Y el logo con priority; /tienda tenía cuatro.
//   2. React 19 (SSR) precarga AUTOMATICAMENTE cualquier <img> salvo que sea
//      loading="lazy" o fetchPriority="low". Quitar `priority` no bastaba:
//      los logos seguían generando 2-3 preloads por página, incluido el de
//      un overlay de transición que está oculto.
//
// Queda un solo preload de imagen por vista: la foto LCP. El logo se carga
// eager pero con fetchPriority="low", que React excluye del preload.

const IMAGENES = /<(?:Image|img)\b[\s\S]{0,600}?\/>/g;
const archivos = globSync("app/**/*.js", { cwd: process.cwd() });

function bloques(src) {
  return [...src.matchAll(IMAGENES)].map((m) => m[0]);
}

describe("preloads de imagen", () => {
  it("el logo nunca se precarga ni se pide con prioridad alta", () => {
    let vistos = 0;
    for (const archivo of archivos) {
      const logos = bloques(readFileSync(archivo, "utf8")).filter((b) =>
        b.includes("/arconet.png"),
      );
      for (const logo of logos) {
        vistos++;
        expect(logo, archivo).not.toMatch(/\bpriority\b/);
        expect(logo, archivo).not.toContain('fetchPriority="high"');
        // React 19 omite el <link rel=preload> de las imagenes con prioridad baja.
        expect(logo, archivo).toContain('fetchPriority="low"');
      }
    }
    expect(vistos).toBeGreaterThan(10);
  });

  it("cada vista tiene como máximo una imagen prioritaria con src fijo", () => {
    for (const archivo of archivos) {
      const prioritarias = bloques(readFileSync(archivo, "utf8")).filter(
        (b) => /\bpriority\b/.test(b) && /src="\//.test(b),
      );
      expect(prioritarias.length, `${archivo} tiene ${prioritarias.length} preloads`).toBeLessThanOrEqual(1);
    }
  });

  it("las imágenes de un modal que no se ve al entrar no se precargan", () => {
    const catalogo = readFileSync("app/tienda/catalogo-experience.js", "utf8");
    const gate = bloques(catalogo).find((b) => b.includes('src="/catalogo/bodeg.avifa.avif"'));
    expect(gate).toBeDefined();
    expect(gate).toContain('loading="lazy"');
    expect(gate).not.toMatch(/\bpriority\b/);
  });

  it("la imagen LCP de cada vista conserva su prioridad", () => {
    // Estas sí son las que se ven al entrar: quitarles priority empeora el LCP.
    const esperadas = [
      ["app/home-experience.js", "/empresa.webp"],
      ["app/contacto/contact-experience.js", "/contacto-asesoria-fibra.webp"],
      ["app/tienda/catalogo-experience.js", "/catalogo/ingeniero-caso-panoramica.webp"],
      ["app/ayuda/page.js", "/escudo-digital.webp"],
    ];
    for (const [archivo, src] of esperadas) {
      const bloque = bloques(readFileSync(archivo, "utf8")).find((b) => b.includes(`src="${src}"`));
      expect(bloque, archivo).toMatch(/\bpriority\b/);
    }
  });
});
