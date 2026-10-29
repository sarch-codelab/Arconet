import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrintPaperPreference, rememberPrintPaperPreference } from "../lib/print-preference";
let values;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
  rememberPrintPaperPreference("auto");
  values.clear();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("preferencia de papel sin información privada", () => {
  it("empieza en automático y recuerda únicamente la clave de formato", () => {
    expect(getPrintPaperPreference()).toBe("auto");
    rememberPrintPaperPreference("ticket-80");
    expect(getPrintPaperPreference()).toBe("ticket-80");
    expect([...values.entries()]).toEqual([["arconet-print-paper", "ticket-80"]]);
  });
  it("recupera la elección guardada por otra visita", () => {
    values.set("arconet-print-paper", "ticket-58");
    expect(getPrintPaperPreference()).toBe("ticket-58");
  });
  it("funciona aunque el navegador bloquee todo el almacenamiento", () => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Bloqueado", "SecurityError"); } });
    rememberPrintPaperPreference("media-hoja");
    expect(getPrintPaperPreference()).toBe("media-hoja");
  });
  it.each(["__proto__", "csv", "<script>", ["ticket-80"], null])("no guarda valores no permitidos: %s", value => {
    rememberPrintPaperPreference(value);
    expect(getPrintPaperPreference()).toBe("auto");
    expect(values.size).toBe(0);
  });
  it("el servidor no lee preferencias del navegador", () => {
    rememberPrintPaperPreference("ticket-58");
    vi.stubGlobal("window", undefined);
    expect(getPrintPaperPreference()).toBe("auto");
  });
});
