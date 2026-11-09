import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { desplazarFila } from "../app/catalogo/desplazar-fila";

afterEach(() => vi.unstubAllGlobals());

function crearFila({ ancho = 260, gap = "12px", visible = 600, total = 1200, actual = 0 } = {}) {
  vi.stubGlobal("getComputedStyle", () => ({ columnGap: gap }));
  return {
    firstElementChild: { getBoundingClientRect: () => ({ width: ancho }) },
    clientWidth: visible,
    scrollWidth: total,
    scrollLeft: actual,
    scrollTo: vi.fn(),
  };
}

describe("desplazamiento con flechas en catálogo", () => {
  it.each([["12px", 272], ["8px", 268], ["14px", 274], ["0px", 260]])(
    "usa el gap real %s para avanzar al siguiente elemento", (gap, destino) => {
      const fila = crearFila({ gap });
      desplazarFila({ current: fila }, 1);
      expect(fila.scrollTo).toHaveBeenCalledWith({ left: destino, behavior: "instant" });
    }
  );

  it("retrocede, vuelve al inicio y limita el avance al final", () => {
    const fila = crearFila({ actual: 544 });
    desplazarFila({ current: fila }, -1);
    expect(fila.scrollTo).toHaveBeenLastCalledWith({ left: 272, behavior: "instant" });
    fila.scrollLeft = 272;
    desplazarFila({ current: fila }, -1);
    expect(fila.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "instant" });
    fila.scrollLeft = 544;
    desplazarFila({ current: fila }, 1);
    expect(fila.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: "instant" });
    fila.scrollLeft = 600;
    desplazarFila({ current: fila }, -1);
    expect(fila.scrollTo).toHaveBeenLastCalledWith({ left: 544, behavior: "instant" });
  });

  it("tolera referencias vacías y filas sin ancho", () => {
    expect(() => desplazarFila({ current: null }, 1)).not.toThrow();
    const fila = crearFila({ ancho: 0, gap: "0px", visible: 0, total: 0 });
    desplazarFila({ current: fila }, 1);
    expect(fila.scrollTo).not.toHaveBeenCalled();
  });

  it("los relacionados también usan flechas y no muestran barra", () => {
    const js = readFileSync("app/catalogo/ficha/[slug]/ficha-producto.js", "utf8");
    const css = readFileSync("app/catalogo/ficha/[slug]/ficha-producto.module.css", "utf8");
    expect(js).toContain("desplazarFila(relacionadosRef, -1)");
    expect(js).toContain("desplazarFila(relacionadosRef, 1)");
    expect(css).toMatch(/\.relacionadosFila\s*\{[^}]*overflow-x: hidden/);
    expect(css).not.toMatch(/\.relacionadosFila\s*\{[^}]*scroll-snap-type/);
    expect(js).not.toMatch(/onWheel|onTouch|addEventListener\(\s*["']wheel/);
  });
});
