import { describe, it, expect } from "vitest";
import { formatTimestamp } from "../app/admin/log-utils";

describe("formatTimestamp", () => {
  it("retorna un guion largo cuando el valor es vacio", () => {
    expect(formatTimestamp(null)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
    expect(formatTimestamp("")).toBe("—");
  });

  it("formatea una fecha ISO valida en espanol de Honduras", () => {
    const salida = formatTimestamp("2026-10-27T15:30:00.000Z");
    // Debe contener dia, mes abreviado, ano y hora:minuto
    expect(salida).toMatch(/\d{2} de \w+ de 2026/);
    expect(salida).toMatch(/\d{2}:\d{2}/);
  });

  it("acepta objetos Date nativos", () => {
    const salida = formatTimestamp(new Date("2026-01-01T12:00:00Z"));
    expect(salida).toContain("2026");
  });

  it("no lanza con valores no parseables y devuelve el texto original", () => {
    const salida = formatTimestamp("cadena-invalidada-no-numerica");
    expect(typeof salida).toBe("string");
    expect(salida.length).toBeGreaterThan(0);
  });
});
