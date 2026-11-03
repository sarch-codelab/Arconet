// Paletas iniciales de las ilustraciones locales: evita un destello azul antes
// de cargar las imágenes. Las fotos del panel se muestrean al terminar de cargar.
const ART_COLORS = {
  "activas.webp": [168, 226, 245],
  "cajas.webp": [253, 204, 196],
  "escaleras.webp": [184, 189, 242],
  "gabinetes.webp": [171, 174, 230],
  "herrajes.webp": [224, 200, 224],
  "herramientas.webp": [254, 219, 238],
  "medicion.webp": [200, 213, 247],
  "odf.webp": [249, 236, 234],
  "pasivos.webp": [187, 220, 225],
  "preconectorizado.webp": [191, 210, 247],
};

export function folderPaletteFromRgb(rgb) {
  const valid = Array.isArray(rgb) && rgb.length === 3 && rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 255);
  const [r, g, b] = (valid ? rgb : ART_COLORS["preconectorizado.webp"]).map(value => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 218;
  let saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    hue = (hue + 360) % 360;
  }
  // Una imagen neutra usa azul pizarra. Nunca negro/blanco puros ni colores
  // demasiado saturados: texto blanco en la pestaña y tinta oscura en el frente.
  if (saturation < 0.08) hue = 218;
  hue = Math.round(hue);
  const bodySaturation = Math.round(Math.max(25, Math.min(65, saturation * 100)));
  return {
    // Tonos oscuros del mismo matiz: no filtrar ni oscurecer la fotografía.
    "--folder-dark-back": `hsl(${hue} 38% 12%)`,
    "--folder-dark-tab": `hsl(${hue} 42% 20%)`,
    "--folder-dark-front": `hsl(${hue} ${bodySaturation}% 24%)`,
    "--folder-dark-bottom": `hsl(${hue} ${bodySaturation}% 18%)`,
    "--folder-back": `hsl(${hue} 38% 24%)`,
    "--folder-tab": `hsl(${hue} 42% 30%)`,
    "--folder-front": `hsl(${hue} ${bodySaturation}% 86%)`,
    "--folder-bottom": `hsl(${hue} ${bodySaturation}% 80%)`,
  };
}

export function initialFolderPalette(src) {
  return folderPaletteFromRgb(ART_COLORS[String(src).split("/").pop()]);
}

// 24 × 24 y solo el perímetro: el fondo de la ilustración, no el color de un
// tornillo o del cable central. No se dibuja ni se lee el canvas en el scroll.
export function readFolderImagePalette(image) {
  if (!image?.naturalWidth || typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 24, 24);
    const { data } = context.getImageData(0, 0, 24, 24);
    const bins = new Map();
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (x > 2 && x < 21 && y > 2 && y < 21) continue;
      const i = (y * 24 + x) * 4;
      if (data[i + 3] < 192) continue;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const key = rgb.map(value => Math.floor(value / 32)).join(",");
      const bin = bins.get(key) || { count: 0, sums: [0, 0, 0] };
      bin.count++;
      rgb.forEach((value, c) => { bin.sums[c] += value; });
      bins.set(key, bin);
    }
    const dominant = [...bins.values()].sort((a, b) => b.count - a.count)[0];
    return dominant ? folderPaletteFromRgb(dominant.sums.map(value => value / dominant.count)) : null;
  } catch {
    // Canvas bloqueado, extensión de privacidad o imagen de otro origen:
    // mantener la paleta inicial y toda la navegación funcional.
    return null;
  }
}
