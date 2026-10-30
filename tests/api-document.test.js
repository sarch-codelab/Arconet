import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberPrintPaperPreference } from "../lib/print-preference";
import { openApiDocument, previewDocumentClick } from "../lib/api-document";
import { clearLocalPreviewSession, rememberLocalPreviewSession } from "../lib/api-fetch";
import { closeDocumentPreview, getDocumentPreview } from "../lib/document-preview";

let request;
let anchor;
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "1");
  const stored = new Map();
  vi.stubGlobal("window", { location: new URL("https://preview.example.test/panel-administrativo"), open: vi.fn(() => { throw new Error("Popups prohibidos"); }), sessionStorage: { setItem: (k, v) => stored.set(k, v), getItem: k => stored.get(k), removeItem: k => stored.delete(k) } });
  anchor = { click: vi.fn(), remove: vi.fn() };
  rememberPrintPaperPreference("auto");
  vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
  request = vi.fn().mockResolvedValue(new Response("documento", { headers: { "Content-Type": "text/html" } }));
  vi.stubGlobal("fetch", request);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:https://preview.example.test/documento");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.useFakeTimers();
});
afterEach(() => {
  closeDocumentPreview();
  clearLocalPreviewSession("admin");
  clearLocalPreviewSession("cliente");
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const path = "/api/ordenes/prueba/documento";
describe("documentos sin ventanas emergentes", () => {
  it("abre el siguiente recibo con el papel recordado, sin cambiar la exportación CSV", async () => {
    rememberPrintPaperPreference("ticket-58");
    await openApiDocument(path);
    expect(new URL(request.mock.calls[0][0]).searchParams.get("formato")).toBe("ticket-58");
    request.mockResolvedValue(new Response("csv", { headers: { "Content-Type": "text/csv" } }));
    await openApiDocument("/api/facturacion/libro-ventas?formato=csv");
    expect(new URL(request.mock.calls[1][0]).searchParams.get("formato")).toBe("csv");
  });
  it("un formato solicitado expresamente tiene prioridad sobre la preferencia", async () => {
    rememberPrintPaperPreference("ticket-80");
    await openApiDocument(path + "?formato=media-carta");
    expect(new URL(request.mock.calls[0][0]).searchParams.get("formato")).toBe("media-carta");
  });
  it("abre el visor autenticado sin llamar a window.open ni poner tokens en la URL", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    await openApiDocument(path);
    expect(request.mock.calls[0][1].headers.get("X-Arconet-Preview-Session")).toBe("payload.firma");
    expect(request.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(getDocumentPreview()).toMatchObject({ url: "blob:https://preview.example.test/documento", filename: "arconet-documento.html" });
    expect(window.open).not.toHaveBeenCalled();
  });
  it("entrega el HTML UTF-8 al iframe sin navegar al blob, conservando la copia descargable", async () => {
    const html = '<!doctype html><html><body><main class="sheet">Cotización · Cámara · L 285.00</main></body></html>';
    request.mockResolvedValue(new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
    await openApiDocument(path);
    expect(getDocumentPreview()).toMatchObject({ html, url: "blob:https://preview.example.test/documento" });
    const [blob] = URL.createObjectURL.mock.calls[0];
    expect(await blob.text()).toBe(html);
    expect(anchor.click).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });
  it.each(["", " \n\t"])('rechaza HTML vacío en lugar de dejar un visor blanco: %j', async html => {
    request.mockResolvedValue(new Response(html, { headers: { "Content-Type": "text/html" } }));
    await expect(openApiDocument(path)).rejects.toThrow("está vacío");
    expect(getDocumentPreview()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("no reabre ni conserva HTML que termina de leerse después de cerrar", async () => {
    let finishReading;
    const text = vi.fn(() => new Promise(resolve => { finishReading = resolve; }));
    request.mockResolvedValue({ ok: true, headers: new Headers({ "Content-Type": "text/html" }), blob: async () => ({ type: "text/html", text }) });
    const opening = openApiDocument(path);
    await vi.waitFor(() => expect(text).toHaveBeenCalledOnce());
    closeDocumentPreview();
    finishReading('<main class="sheet">Documento tardío</main>');
    await opening;
    expect(getDocumentPreview()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("también funciona si window.open devuelve null", async () => {
    window.open.mockReturnValue(null);
    rememberLocalPreviewSession("admin", "payload.firma");
    await expect(openApiDocument(path)).resolves.toBeUndefined();
    expect(getDocumentPreview()?.url).toBe("blob:https://preview.example.test/documento");
    expect(window.open).not.toHaveBeenCalled();
  });
  it("no depende de window.open aunque ni siquiera exista", async () => {
    delete window.open;
    await openApiDocument(path);
    expect(getDocumentPreview()?.url).toBeTruthy();
  });
  it("mantiene el documento disponible más de un minuto y lo libera al cerrar", async () => {
    await openApiDocument(path);
    vi.advanceTimersByTime(120_000);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(getDocumentPreview()?.url).toBeTruthy();
    closeDocumentPreview();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(getDocumentPreview()).toBeNull();
  });
  it("los enlaces de producción usan cookies y el mismo visor, sin cabecera local", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const event = { preventDefault: vi.fn(), currentTarget: { href: "https://preview.example.test" + path } };
    await previewDocumentClick(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1].headers).toBeUndefined();
    expect(getDocumentPreview()?.url).toBeTruthy();
    expect(window.open).not.toHaveBeenCalled();
  });
  it("usa exclusivamente la sesión del cliente al abrir su documento", async () => {
    rememberLocalPreviewSession("admin", "admin.firma");
    rememberLocalPreviewSession("cliente", "cliente.firma");
    await openApiDocument("/api/cliente-portal/documentos/prueba", "cliente");
    expect(request.mock.calls[0][1].headers.get("X-Arconet-Preview-Session")).toBe("cliente.firma");
  });
  it.each(["https://otro.example/api/documento", "/admin", "javascript:alert(1)"])("rechaza una URL no permitida: %s", async input => {
    await expect(openApiDocument(input)).rejects.toThrow("esta aplicación");
    expect(getDocumentPreview()).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it("respeta el nombre de un adjunto y lo descarga sin abrir pestañas", async () => {
    request.mockResolvedValue(new Response("csv", { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="libro.csv"' } }));
    await openApiDocument("/api/facturacion/libro-ventas?formato=csv");
    expect(anchor.download).toBe("libro.csv");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(getDocumentPreview()).toBeNull();
    expect(window.open).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });
  it("conserva los nombres inline del documento fiscal", async () => {
    request.mockResolvedValue(new Response("factura", { headers: { "Content-Type": "text/html", "Content-Disposition": 'inline; filename="FACT-001.html"' } }));
    await openApiDocument(path);
    expect(getDocumentPreview()?.filename).toBe("FACT-001.html");
  });
  it("elimina rutas del nombre de un archivo descargado", async () => {
    request.mockResolvedValue(new Response("csv", { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="../../libro.csv"' } }));
    await openApiDocument(path);
    expect(anchor.download).toBe("libro.csv");
  });
  it("puede visualizar un PDF en el mismo panel", async () => {
    request.mockResolvedValue(new Response("pdf", { headers: { "Content-Type": "application/pdf" } }));
    await openApiDocument(path);
    expect(getDocumentPreview()?.filename).toBe("arconet-documento.pdf");
    expect(getDocumentPreview()).not.toHaveProperty("html");
    expect(anchor.click).not.toHaveBeenCalled();
  });
  it("cierra el visor de carga y comunica un acceso denegado", async () => {
    request.mockResolvedValue(new Response("", { status: 403 }));
    await expect(openApiDocument(path)).rejects.toThrow("No se pudo abrir");
    expect(getDocumentPreview()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("comunica un fallo de red sin dejar un visor vacío", async () => {
    request.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(openApiDocument(path)).rejects.toThrow("Failed to fetch");
    expect(getDocumentPreview()).toBeNull();
  });
  it("permite cancelar una carga sin mostrar errores ni abrirla al terminar", async () => {
    let resolve;
    request.mockImplementation(() => new Promise(done => { resolve = done; }));
    const opening = openApiDocument(path);
    expect(getDocumentPreview()?.url).toBeNull();
    const signal = request.mock.calls[0][1].signal;
    closeDocumentPreview();
    expect(signal.aborted).toBe(true);
    resolve(new Response("documento", { headers: { "Content-Type": "text/html" } }));
    await expect(opening).resolves.toBeUndefined();
    expect(getDocumentPreview()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("no muestra un error al abortar fetch desde Cerrar", async () => {
    request.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Cancelado", "AbortError")));
    }));
    const opening = openApiDocument(path);
    closeDocumentPreview();
    await expect(opening).resolves.toBeUndefined();
  });
  it("no deja que una petición antigua cierre o reemplace la nueva", async () => {
    let failOld;
    request.mockImplementationOnce(() => new Promise((resolve, reject) => { failOld = reject; }));
    const old = openApiDocument(path);
    await openApiDocument(path);
    const current = getDocumentPreview();
    failOld(new TypeError("Error anterior"));
    await old;
    expect(getDocumentPreview()).toBe(current);
  });
});
