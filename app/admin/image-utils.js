export const IMAGE_MAX_DIMENSION = 512;
export const IMAGE_QUALITY = 0.82;

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    image.src = src;
  });
}

export async function compressImage(file, { maxDimension = IMAGE_MAX_DIMENSION, quality = IMAGE_QUALITY } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  if (typeof document === "undefined") return dataUrl;

  let image;
  try {
    image = await loadImage(dataUrl);
  } catch {
    return dataUrl;
  }

  const { width, height } = image;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const hasAlpha = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
  const mime = hasAlpha ? "image/webp" : "image/jpeg";

  let output;
  try {
    output = canvas.toDataURL(mime, quality);
  } catch {
    output = canvas.toDataURL("image/jpeg", quality);
  }

  if (!output || output === "data:,") return dataUrl;
  return output.length < dataUrl.length ? output : dataUrl;
}
