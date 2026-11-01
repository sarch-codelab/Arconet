// Las fotos del panel se guardan en la base como data URL (base64) para no
// depender de un almacén de archivos, pero no deben viajar dentro del JSON de
// los listados.
//
// Antes, /api/productos devolvía `foto` y `fotos` completas: con 16 productos
// con imagen la respuesta pesaba 16.8 MB, y el panel las pide al entrar, así
// que en una conexión normal se quedaba varios segundos cargando sin que el
// usuario hubiera abierto siquiera Productos. Lo mismo con los avatares de
// clientes y trabajadores.
//
// Ahora el listado entrega una ruta corta (/api/productos/<id>/foto?v=...), el
// navegador la pide como imagen solo cuando la tarjeta se pinta y la respuesta
// se guarda en caché con ETag. La vista previa del editor conserva el data URL
// completo porque ahí sí hace falta el contenido.

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;

export function esDataUrl(valor) {
  return typeof valor === "string" && DATA_URL.test(valor);
}

function esRutaOUrl(valor) {
  return typeof valor === "string" && !DATA_URL.test(valor) && (valor.startsWith("/") || /^https?:\/\//i.test(valor) || valor.startsWith("blob:"));
}

// Un valor de imagen que ya es una URL se devuelve tal cual. Un data URL se
// sustituye por la ruta del endpoint que la sirve.
export function fotoComoUrl(valor, ruta) {
  if (!valor) return "";
  if (esDataUrl(valor)) return ruta;
  return esRutaOUrl(valor) ? valor : "";
}

// Galería: las rutas y URL se respetan; los data URL pasan por el endpoint.
export function galeriaComoUrls(lista, rutaBase) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item, indice) => {
      if (!item) return "";
      if (esDataUrl(item)) return `${rutaBase}?i=${indice}`;
      return esRutaOUrl(item) ? item : "";
    })
    .filter(Boolean);
}

// Versión corta para invalidar la caché cuando la foto cambia. No expone la
// imagen, solo evita que el navegador reutilice una anterior.
export function huellaFoto(valor) {
  if (!valor) return "";
  let hash = 0;
  const texto = String(valor);
  // Solo se recorren los extremos: alcanza para detectar un cambio de imagen y
  // no cuesta procesar un megabyte por producto.
  const muestra = texto.length > 512 ? texto.slice(0, 256) + texto.slice(-256) + texto.length : texto;
  for (let i = 0; i < muestra.length; i += 1) {
    hash = (Math.imul(hash, 31) + muestra.charCodeAt(i)) | 0;
  }
  return `${texto.length.toString(36)}${(hash >>> 0).toString(36)}`;
}

// Convierte un valor almacenado en lo que devuelve una respuesta HTTP de
// imagen: el tipo MIME y los bytes.
export function imagenDesdeValor(valor) {
  if (!esDataUrl(valor)) return null;
  const coma = valor.indexOf(",");
  const cabecera = valor.slice(0, coma);
  const mime = cabecera.slice(5, cabecera.indexOf(";")) || "image/png";
  const cuerpo = valor.slice(coma + 1).replace(/\s+/g, "");
  return { mime, cuerpo };
}
