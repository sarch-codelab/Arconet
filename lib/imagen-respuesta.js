import { imagenDesdeValor } from "./imagenes";

// Respuesta de imagen para las fotos guardadas en la base como data URL.
//
// Se sirve con ETag y `private, max-age` corto: el navegador pide la imagen
// una vez, la revalida con un 304 barato y no vuelve a bajarla al navegar por
// el panel. `private` porque son datos internos de una cuenta con sesión; no
// deben quedar en una caché compartida. Si nada de eso aplica, responde 404
// para que el listado muestre las iniciales en lugar de un hueco roto.
export function respuestaImagen(valor, { etag = true } = {}) {
  const imagen = imagenDesdeValor(valor);
  if (!imagen) return new Response("Sin imagen", { status: 404, headers: { "Cache-Control": "no-store" } });

  const bytes = Buffer.from(imagen.cuerpo, "base64");
  const headers = {
    "Content-Type": imagen.mime,
    "Content-Length": String(bytes.length),
    "Cache-Control": "private, max-age=3600, must-revalidate",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    // Una imagen guardada por el panel no debe poder ejecutar nada.
    "Content-Security-Policy": "default-src 'none'; img-src data:; sandbox",
  };
  if (etag) headers.ETag = `"${bytes.length.toString(16)}-${imagen.cuerpo.length.toString(16)}"`;

  return new Response(bytes, { status: 200, headers });
}

// Reutiliza el ETag del cliente cuando la imagen no cambió.
//
// Si la foto ya está en el almacén de disco (ruta /media/...), se reenvía ahí:
// ese endpoint la sirve con caché inmutable y sin volver a la base.
export function respuestaImagenConEtag(valor, request) {
  if (typeof valor === "string" && valor.startsWith("/media/")) {
    return Response.redirect(new URL(valor, request?.url ?? "http://localhost"), 307);
  }
  const imagen = imagenDesdeValor(valor);
  if (!imagen) return respuestaImagen(valor);
  const etiqueta = `"${imagen.cuerpo.length.toString(16)}-${imagen.cuerpo.slice(0, 32)}"`.replace(/[^"a-zA-Z0-9-]/g, "");
  if (request?.headers?.get("if-none-match") === etiqueta) {
    return new Response(null, { status: 304, headers: { ETag: etiqueta, "Cache-Control": "private, max-age=3600, must-revalidate" } });
  }
  const respuesta = respuestaImagen(valor, { etag: false });
  if (respuesta.status === 200) respuesta.headers.set("ETag", etiqueta);
  return respuesta;
}
