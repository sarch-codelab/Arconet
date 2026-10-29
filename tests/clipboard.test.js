import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "../lib/clipboard";

let area;
let doc;
let writeText;
beforeEach(() => {
  area = { value: "", style: {}, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn() };
  doc = {
    permissionsPolicy: { allowsFeature: vi.fn(() => true) },
    body: { appendChild: vi.fn() },
    activeElement: { focus: vi.fn() },
    createElement: vi.fn(() => area),
    execCommand: vi.fn(() => true),
  };
  writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { isSecureContext: true });
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});
afterEach(() => vi.unstubAllGlobals());

describe("copyText", () => {
  it("usa la API segura cuando está permitida", async () => {
    expect(await copyText("Pedido de prueba")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Pedido de prueba");
    expect(doc.createElement).not.toHaveBeenCalled();
  });

  it("evita la API prohibida por el iframe y usa la alternativa", async () => {
    doc.permissionsPolicy.allowsFeature.mockReturnValue(false);
    expect(await copyText("Pedido local")).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    expect(doc.execCommand).toHaveBeenCalledWith("copy");
    expect(area.value).toBe("Pedido local");
    expect(area.remove).toHaveBeenCalledOnce();
    expect(doc.activeElement.focus).toHaveBeenCalledOnce();
  });

  it("maneja NotAllowedError e intenta copiar sin promesas rechazadas", async () => {
    writeText.mockRejectedValue(Object.assign(new Error("Permissions Policy"), { name: "NotAllowedError" }));
    await expect(copyText("Borrador")).resolves.toBe(true);
    expect(doc.execCommand).toHaveBeenCalledOnce();
  });

  it("no informa éxito si ambas alternativas fallan", async () => {
    writeText.mockRejectedValue(new Error("Bloqueado"));
    doc.execCommand.mockReturnValue(false);
    await expect(copyText("No copiado")).resolves.toBe(false);
    expect(area.remove).toHaveBeenCalledOnce();
  });

  it("limpia el textarea aunque la alternativa lance una excepción", async () => {
    writeText.mockRejectedValue(new Error("Bloqueado"));
    doc.execCommand.mockImplementation(() => { throw new Error("No autorizado"); });
    await expect(copyText("No copiado")).resolves.toBe(false);
    expect(area.remove).toHaveBeenCalledOnce();
  });

  it("funciona sin Clipboard API en navegadores antiguos", async () => {
    vi.stubGlobal("navigator", {});
    expect(await copyText("Texto")).toBe(true);
    expect(doc.execCommand).toHaveBeenCalledOnce();
  });

  it("no usa la API segura en un contexto inseguro", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    expect(await copyText("Texto")).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("tolera navegadores sin Permissions Policy", async () => {
    delete doc.permissionsPolicy;
    expect(await copyText("Texto")).toBe(true);
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("restaura la selección anterior tras usar la alternativa", async () => {
    doc.permissionsPolicy.allowsFeature.mockReturnValue(false);
    const savedRange = {};
    const selection = { rangeCount: 1, getRangeAt: vi.fn(() => ({ cloneRange: () => savedRange })), removeAllRanges: vi.fn(), addRange: vi.fn() };
    doc.getSelection = () => selection;
    expect(await copyText("Texto")).toBe(true);
    expect(selection.removeAllRanges).toHaveBeenCalledOnce();
    expect(selection.addRange).toHaveBeenCalledWith(savedRange);
  });

  it("tolera errores de selección y limpieza sin rechazar la promesa", async () => {
    doc.permissionsPolicy.allowsFeature.mockReturnValue(false);
    doc.getSelection = () => { throw new Error("Selección inaccesible"); };
    area.remove.mockImplementation(() => { throw new Error("Nodo eliminado"); });
    await expect(copyText("Texto")).resolves.toBe(true);
    expect(doc.activeElement.focus).toHaveBeenCalledOnce();
  });

  it("no falla fuera del navegador ni con entradas inválidas", async () => {
    expect(await copyText(null)).toBe(false);
    vi.stubGlobal("document", undefined);
    await expect(copyText("Texto")).resolves.toBe(false);
  });
});
