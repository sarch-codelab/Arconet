import { afterEach, describe, expect, it, vi } from "vitest";
import { folderPaletteFromRgb, initialFolderPalette, readFolderImagePalette } from "../lib/folder-palette";

function luminance(hsl, whiteOverlay = 0) {
  const [h, s, l] = hsl.match(/[\d.]+/g).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channels = [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    const channel = c * (1 - whiteOverlay) + whiteOverlay;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
afterEach(() => vi.unstubAllGlobals());

describe("paletas de las carpetas", () => {
  it("las ilustraciones tienen paleta propia desde el primer render", () => {
    const blue = initialFolderPalette("/catalogo/lineas/cards/preconectorizado.webp");
    const purple = initialFolderPalette("/catalogo/lineas/cards/herrajes.webp");
    const peach = initialFolderPalette("/catalogo/lineas/cards/cajas.webp");
    expect(new Set([blue["--folder-tab"], purple["--folder-tab"], peach["--folder-tab"]]).size).toBe(3);
    expect(blue).toEqual(initialFolderPalette("/catalogo/lineas/cards/preconectorizado.webp"));
  });

  it.each([null, [], [NaN, 0, 0], [256, 0, 0], [-1, 0, 0]])("tolera entradas inválidas %j", rgb => {
    expect(folderPaletteFromRgb(rgb)).toEqual(initialFolderPalette("desconocida.webp"));
  });

  it("asegura contraste de texto en todos los matices, incluidos blanco y negro", () => {
    const values = [0, 64, 128, 192, 255];
    for (const r of values) for (const g of values) for (const b of values) {
      const palette = folderPaletteFromRgb([r, g, b]);
      expect(1.05 / (luminance(palette["--folder-tab"]) + 0.05)).toBeGreaterThan(4.5);
      // La tinta #123d5e tiene luminancia aproximada 0.043.
      expect((luminance(palette["--folder-bottom"]) + 0.05) / 0.093).toBeGreaterThan(4.5);
    }
  });

  it("muestrea solo el perímetro e ignora píxeles transparentes", () => {
    const data = new Uint8ClampedArray(24 * 24 * 4);
    for (let p = 0; p < 24 * 24; p++) data.set([220, 190, 225, 255], p * 4);
    for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) data.set([0, 255, 0, 255], (y * 24 + x) * 4);
    const drawImage = vi.fn();
    const getImageData = vi.fn(() => ({ data }));
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({ drawImage, getImageData }) }) });
    expect(readFolderImagePalette({ naturalWidth: 1200 })).toEqual(folderPaletteFromRgb([220, 190, 225]));
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 24, 24);
    data.fill(0);
    expect(readFolderImagePalette({ naturalWidth: 1200 })).toBeNull();
  });

  it("no rompe la tarjeta si canvas está bloqueado o la imagen no ha cargado", () => {
    expect(readFolderImagePalette({ naturalWidth: 0 })).toBeNull();
    vi.stubGlobal("document", { createElement: () => { throw new Error("SecurityError"); } });
    expect(readFolderImagePalette({ naturalWidth: 1200 })).toBeNull();
  });
});

describe("paletas oscuras de carpetas", () => {
  it("mantiene contraste AA de texto blanco y claro en cualquier matiz", () => {
    const values = [0, 64, 128, 192, 255];
    for (const r of values) for (const g of values) for (const b of values) {
      const palette = folderPaletteFromRgb([r, g, b]);
      for (const key of ["--folder-dark-tab", "--folder-dark-front", "--folder-dark-bottom"]) {
        const channels = [230, 237, 248].map(v => ((v / 255 + 0.055) / 1.055) ** 2.4);
        const text = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        // Caso conservador: el brillo máximo del hover también bajo el texto.
        for (const glow of [0, 0.05]) {
          expect((text + 0.05) / (luminance(palette[key], glow) + 0.05)).toBeGreaterThan(4.5);
        }
      }
      expect(palette["--folder-dark-front"].split(" ")[0]).toBe(palette["--folder-front"].split(" ")[0]);
    }
  });
});
