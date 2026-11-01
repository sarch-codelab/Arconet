import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Las fotos del panel no se guardan en la base de datos.
//
// Antes se guardaban como data URL (base64) en la propia columna: hasta 200 KB
// de texto por imagen. Eso tenía tres consecuencias:
//
//   - El listado de productos pesaba 16.8 MB con 16 fotos, y el panel lo pide
//     al entrar (se quedaba segundos cargando).
//   - Cada respaldo de PostgreSQL arrastraba todas las imágenes.
//   - La base crecía con datos que no son datos: son archivos.
//
// Ahora la imagen se escribe en disco y en la columna queda solo su ruta
// (/media/productos/<id>.<ext>). El directorio vive fuera del código porque el
// despliegue hace `git reset --hard`: si estuviera en public/, cada despliegue
// borraría las fotos. Se puede cambiar con MEDIA_DIR.
export const MEDIA_DIR = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.join(process.cwd(), ".media");

// Las carpetas separan por tipo de registro para que la ruta sea legible.
export const CARPETAS = {
  productos: "productos",
  clientes: "clientes",
  trabajadores: "trabajadores",
  usuarios: "usuarios",
  categorias: "categorias",
};

const EXTENSIONES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// Tope de tamaño de la imagen ya decodificada. El editor comprime a 512 px
// (~200 KB); esto solo evita que un archivo enorme entre por la API.
const MAX_BYTES = 400 * 1024;

const DATA_URL = /^data:(image\/(?:png|jpe?g|webp|gif|avif));base64,([a-z0-9+/=\s]+)$/i;

export function extensionDe(mime) {
  return EXTENSIONES[String(mime || "").toLowerCase()] || null;
}

// Lee un data URL y devuelve el tipo y los bytes. Sin él no es una imagen.
export function decodificarDataUrl(valor) {
  if (typeof valor !== "string") return null;
  const coincidencia = valor.match(DATA_URL);
  if (!coincidencia) return null;
  const mime = coincidencia[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const extension = extensionDe(mime);
  if (!extension) return null;
  const cuerpo = coincidencia[2].replace(/\s+/g, "");
  let bytes;
  try {
    bytes = Buffer.from(cuerpo, "base64");
  } catch {
    return null;
  }
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  // Comprobación mínima de que los bytes son la imagen que dicen ser: base64
  // válido no implica una imagen válida.
  if (!firmaValida(bytes, mime)) return null;
  return { mime, extension, bytes };
}

function firmaValida(bytes, mime) {
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/gif") return bytes.subarray(0, 3).toString("ascii") === "GIF";
  if (mime === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "image/avif") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

// Ruta pública de la imagen a partir de la carpeta y el nombre.
export function rutaPublica(carpeta, archivo) {
  return `/media/${carpeta}/${archivo}`;
}

// Una ruta que ya apunta a este almacén.
export function esRutaGuardada(valor) {
  return typeof valor === "string" && /^\/media\/[a-z]+\/[a-z0-9][a-z0-9._-]*$/i.test(valor);
}

// Nombres admitidos en /media/<carpeta>/<archivo>: nada de ../ ni rutas
// absolutas que puedan salirse del directorio.
const NOMBRE_VALIDO = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

export function carpetaValida(carpeta) {
  return Object.values(CARPETAS).includes(carpeta);
}

export function nombreValido(archivo) {
  return NOMBRE_VALIDO.test(archivo) && !archivo.includes("..");
}

// Dirección en disco de una imagen ya validada.
export function rutaEnDisco(carpeta, archivo) {
  if (!carpetaValida(carpeta) || !nombreValido(archivo)) return null;
  return path.join(MEDIA_DIR, carpeta, archivo);
}

// Guarda la imagen y devuelve la ruta pública. El nombre lleva un hash del
// contenido: dos subidas de la misma foto reutilizan el archivo y un cambio
// real produce un nombre nuevo, así que la caché del navegador nunca sirve una
// imagen vieja.
export async function guardarImagen({ carpeta, dataUrl, base = "img" }) {
  if (!carpetaValida(carpeta)) throw new Error("Carpeta de imágenes desconocida.");
  // Ya está guardada (una ruta del almacén) o es una ruta/URL ajena: se
  // devuelve tal cual. Sin esto, editar un producto que conserva su foto
  // fallaba con "la imagen no es válida".
  if (typeof dataUrl === "string" && !dataUrl.startsWith("data:")) {
    if (esRutaGuardada(dataUrl) || dataUrl.startsWith("/") || /^https?:\/\//i.test(dataUrl)) return dataUrl;
  }
  const imagen = decodificarDataUrl(dataUrl);
  if (!imagen) throw new Error("La imagen no es válida o supera los 400 KB.");

  const huella = createHash("sha256").update(imagen.bytes).digest("hex").slice(0, 16);
  const limpio = String(base || "img").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "img";
  const archivo = `${limpio}-${huella}.${imagen.extension}`;
  const directorio = path.join(MEDIA_DIR, carpeta);
  const destino = path.join(directorio, archivo);

  await mkdir(directorio, { recursive: true });
  try {
    // Si ya existe, el contenido es idéntico (el nombre es su hash).
    await stat(destino);
  } catch {
    await writeFile(destino, imagen.bytes, { mode: 0o644 });
  }
  return rutaPublica(carpeta, archivo);
}

// Igual que guardarImagen, pero para un valor que puede ser ya una ruta: las
// rutas y URL externas se respetan tal cual.
export async function guardarImagenSiHaceFalta({ carpeta, valor, base }) {
  if (!valor) return "";
  if (typeof valor !== "string") return "";
  if (valor.startsWith("data:image/")) return guardarImagen({ carpeta, dataUrl: valor, base });
  if (valor.startsWith("/") || /^https?:\/\//i.test(valor)) return valor;
  return "";
}

// Lee los bytes de una imagen del disco para servirla.
export async function leerImagen(carpeta, archivo) {
  const destino = rutaEnDisco(carpeta, archivo);
  if (!destino) return null;
  try {
    const bytes = await readFile(destino);
    return { bytes, mime: mimeDeArchivo(archivo) };
  } catch {
    return null;
  }
}

export function mimeDeArchivo(archivo) {
  const extension = String(archivo).split(".").pop()?.toLowerCase();
  return Object.entries(EXTENSIONES).find(([, ext]) => ext === extension)?.[0] || "application/octet-stream";
}

// Borra la imagen anterior cuando se reemplaza por otra. Solo actúa sobre
// archivos dentro del almacén: una ruta de /catalogo o una URL externa se deja
// como está.
export async function borrarImagen(ruta) {
  if (typeof ruta !== "string" || !ruta.startsWith("/media/")) return;
  const [, , carpeta, archivo] = ruta.split("/");
  if (!carpeta || !archivo) return;
  const destino = rutaEnDisco(carpeta, archivo);
  if (!destino) return;
  try {
    await unlink(destino);
  } catch {
    // Ya no estaba: no es un error.
  }
}

// Nombre de archivo único para cuando no hay contenido del que sacar el hash.
export function nombreUnico(base = "archivo") {
  return `${base}-${randomUUID()}`;
}
