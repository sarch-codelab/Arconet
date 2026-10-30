import { apiFetch } from "./api-fetch";
import { getPrintPaperPreference } from "./print-preference.js";
import { beginDocumentPreview, closeDocumentPreview, showDocumentPreview } from "./document-preview";

function documentFilename(disposition, type) {
  const value = disposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
  // Conservar los nombres de CSV/XLSX sin aceptar rutas ni caracteres de control.
  const name = (value?.[1] || value?.[2] || "").trim().split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, "_");
  return name || `arconet-documento.${type.startsWith("text/html") ? "html" : type.startsWith("application/pdf") ? "pdf" : "bin"}`;
}

export async function openApiDocument(input, kind = "admin") {
  const url = new URL(input, window.location.href);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
    throw new Error("El documento debe pertenecer a esta aplicación.");
  }
  if (!url.searchParams.has("formato")) url.searchParams.set("formato", getPrintPaperPreference());
  // Siempre en la MISMA pestaña, también con cookies de producción. La
  // descarga autenticada no depende de permisos para ventanas emergentes.
  const { id, signal } = beginDocumentPreview();
  let objectUrl;
  try {
    const response = await apiFetch(url.href, { cache: "no-store", redirect: "error", signal }, kind);
    if (!response.ok) throw new Error("No se pudo abrir el documento.");
    const blob = await response.blob();
    if (signal.aborted) return;
    const disposition = response.headers.get("Content-Disposition") || "";
    const type = (blob.type || response.headers.get("Content-Type") || "").toLowerCase();
    const filename = documentFilename(disposition, type);
    const download = /^attachment/i.test(disposition) || !/^(text\/html|application\/pdf)(;|$)/.test(type);
    // WebKit puede dejar en blanco una navegación blob: dentro del iframe.
    // El HTML autenticado se muestra directamente; el blob queda para guardar.
    const html = !download && /^text\/html(;|$)/.test(type) ? await blob.text() : undefined;
    if (signal.aborted) return;
    if (html !== undefined && !html.trim()) throw new Error("El documento de impresión está vacío. Intenta generarlo de nuevo.");
    objectUrl = URL.createObjectURL(blob);
    if (download) {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      closeDocumentPreview(id);
      const downloadUrl = objectUrl;
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
    } else {
      showDocumentPreview(id, objectUrl, filename, html);
    }
    objectUrl = null; // El visor o el temporizador se encarga de liberarla.
  } catch (error) {
    const cancelled = signal.aborted;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    closeDocumentPreview(id);
    if (!cancelled) throw error;
  }
}

export function previewDocumentClick(event, kind = "admin") {
  event.preventDefault();
  return openApiDocument(event.currentTarget.href, kind);
}
