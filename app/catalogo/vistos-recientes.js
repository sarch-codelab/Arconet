export const VISTOS_KEY = "arconet-productos-vistos-v1";
const MAX_VISTOS = 50;

export function leerVistos(storage) {
  try {
    const datos = JSON.parse(storage.getItem(VISTOS_KEY) || "[]");
    return Array.isArray(datos) ? datos.filter(item => typeof item === "string").slice(0, MAX_VISTOS) : [];
  } catch { return []; }
}

export function registrarVisto(storage, href) {
  try {
    const vistos = leerVistos(storage).filter(item => item !== href);
    storage.setItem(VISTOS_KEY, JSON.stringify([href, ...vistos].slice(0, MAX_VISTOS)));
  } catch { /* La navegación funciona incluso si el almacenamiento está bloqueado. */ }
}
