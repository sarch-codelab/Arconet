// Estado compartido con el visor de impresión. No abre ventanas ni guarda
// documentos/tokens en storage. Cada URL blob vive hasta cerrar el visor.
let preview = null;
let controller = null;
let nextId = 0;
const listeners = new Set();

function publish(value) {
  preview = value;
  for (const listener of listeners) listener();
}

export const getDocumentPreview = () => preview;
export const getServerDocumentPreview = () => null;
export function subscribeDocumentPreview(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function closeDocumentPreview(id = preview?.id) {
  if (!preview || preview.id !== id) return;
  controller?.abort();
  if (preview.url) URL.revokeObjectURL(preview.url);
  controller = null;
  publish(null);
}

export function beginDocumentPreview() {
  closeDocumentPreview();
  controller = new AbortController();
  const id = ++nextId;
  publish({ id, url: null, filename: "" });
  return { id, signal: controller.signal };
}

export function showDocumentPreview(id, url, filename, html) {
  if (preview?.id !== id) {
    URL.revokeObjectURL(url);
    return;
  }
  // HTML en srcdoc: no depender de la navegación a blob: del visor móvil.
  // La URL sigue viva únicamente para guardar una copia (o mostrar un PDF).
  publish({ id, url, filename, ...(typeof html === "string" ? { html } : {}) });
}
