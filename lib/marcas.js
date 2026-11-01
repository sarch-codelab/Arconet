// Marcas del catálogo: logotipo y nombre para la ficha de producto.
//
// El logo se muestra SIN marco (sin tarjeta, sin borde, sin fondo), así que el
// archivo tiene que ser la marca limpia sobre fondo transparente o claro. El
// tamaño lo calcula el CSS con un máximo: nunca crece más allá del límite y las
// marcas anchas (FiberHome, Lindsay) se reducen solas sin deformarse.

const MARCAS = {
  fiberhome: { nombre: "FiberHome", logo: "/marcas/fiberhome.png" },
  sumitomo: { nombre: "Sumitomo", logo: "/marcas/sumitomo.png" },
  lindsay: { nombre: "Lindsay", logo: "/marcas/lindsay.png" },
  joinwit: { nombre: "Joinwit", logo: "/marcas/joinwit.png" },
  // Arconet es la casa: su marca ya está en la cabecera, no se repite aquí.
  arconet: { nombre: "Arconet", logo: "" },
};

/**
 * Devuelve la marca normalizada a partir del texto libre del producto.
 * Tolera acentos, mayúsculas y sufijos ("FiberHome Technologies").
 */
export function findMarca(texto) {
  const clave = String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!clave) return null;

  for (const [id, marca] of Object.entries(MARCAS)) {
    if (clave === id || clave.startsWith(`${id} `) || clave.includes(id)) return { id, ...marca };
  }

  // Marca desconocida: se muestra el texto tal cual, sin logo inventado.
  return { id: "otra", nombre: String(texto).trim(), logo: "" };
}

/**
 * Garantía legible a partir del valor guardado en el producto.
 * Se acepta "12", "12 meses", "1 año" o vacío. Sin dato devuelve "" y la
 * ficha simplemente no pinta la línea: no se inventan garantías.
 */
export function formatGarantia(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  if (/^\d+$/.test(texto)) return `${texto} meses`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
