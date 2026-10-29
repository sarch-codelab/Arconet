import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginDocumentPreview, closeDocumentPreview, getDocumentPreview, getServerDocumentPreview, showDocumentPreview, subscribeDocumentPreview } from "../lib/document-preview";

beforeEach(() => { vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {}); });
afterEach(() => { closeDocumentPreview(); vi.restoreAllMocks(); });

describe("ciclo de vida del visor de impresión", () => {
  it("el HTML del servidor nunca contiene una vista privada", () => {
    beginDocumentPreview();
    expect(getServerDocumentPreview()).toBeNull();
  });
  it("publica la carga y el documento al suscriptor", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDocumentPreview(listener);
    const { id } = beginDocumentPreview();
    showDocumentPreview(id, "blob:documento", "factura.html");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getDocumentPreview()).toEqual({ id, url: "blob:documento", filename: "factura.html" });
    unsubscribe();
    closeDocumentPreview();
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it("cancela la carga anterior al abrir otro documento", () => {
    const first = beginDocumentPreview();
    const second = beginDocumentPreview();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    expect(second.id).not.toBe(first.id);
  });
  it("libera la URL anterior al cambiar de documento", () => {
    const { id } = beginDocumentPreview();
    showDocumentPreview(id, "blob:anterior", "anterior.html");
    beginDocumentPreview();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:anterior");
  });
  it("ignora un cierre antiguo, sin cancelar la nueva carga", () => {
    const first = beginDocumentPreview();
    const second = beginDocumentPreview();
    closeDocumentPreview(first.id);
    expect(getDocumentPreview()?.id).toBe(second.id);
    expect(second.signal.aborted).toBe(false);
  });
  it("descarta y libera un blob que llega después de cerrar", () => {
    const { id } = beginDocumentPreview();
    closeDocumentPreview();
    showDocumentPreview(id, "blob:tardio", "tardio.html");
    expect(getDocumentPreview()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tardio");
  });
  it("cerrar repetidas veces solo libera la URL una vez", () => {
    const { id } = beginDocumentPreview();
    showDocumentPreview(id, "blob:documento", "factura.html");
    closeDocumentPreview();
    closeDocumentPreview();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });
});

describe("CSP del visor sin relajar producción", () => {
  it("permite blob en el visor pero mantiene DENY y frame-ancestors none", async () => {
    const { default: config } = await import("../next.config.mjs");
    vi.stubEnv("NODE_ENV", "production");
    try {
      const [{ headers }] = await config.headers();
      expect(headers.find(h => h.key === "X-Frame-Options")?.value).toBe("DENY");
      const csp = headers.find(h => h.key === "Content-Security-Policy")?.value;
      expect(csp).toContain("frame-src 'self' blob:");
      expect(csp).toContain("frame-ancestors 'none'");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
