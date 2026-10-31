import { describe, expect, it } from "vitest";
import { parseFiscalSettings, fiscalReadiness, fiscalBound, fiscalNumber, fiscalConfigFromRows, fiscalIssuerSnapshot, fiscalRuntimeConfig, hondurasDay } from "../lib/fiscal-settings";
const authorized = { cai: "QA-SIN-VALIDEZ", serie: "999-999-01", correlativo: "1", rangoInicio: "1", rangoFin: "3", fechaLimite: "2099-12-31", nit: "00000000000000", nombre: "EMPRESA QA SIN VALIDEZ", direccion: "Entorno de pruebas" };

describe("Ajustes fiscales estructurales y estado de emisión", () => {
  it("sin autorización conserva registro pendiente, nunca simula validez fiscal", () => {
    expect(fiscalReadiness({ nombre: "Empresa" })).toMatchObject({ state: "unconfigured", tieneRango: false, canIssue: true, pending: true });
    expect(fiscalReadiness({}).issues[0]).toContain("sin número ni validez fiscal");
  });
  it("normaliza rangos numéricos a la misma serie y no inventa CAI ni RTN", () => {
    const parsed = parseFiscalSettings(authorized);
    expect(parsed.errors).toEqual([]);
    expect(parsed.values).toMatchObject({ cai: "QA-SIN-VALIDEZ", nit: "00000000000000", rangoInicio: "999-999-01-000000001", rangoFin: "999-999-01-000000003" });
  });
  it("un antiguo CAI/serie/correlativo sin rango ni vigencia se identifica incompleto", () => {
    const state = fiscalReadiness({ cai: "QA", serie: "999-999-01", correlativo: 1 });
    expect(state.canIssue).toBe(false); expect(state.state).toBe("incomplete");
    expect(state.issues.join(" ")).toMatch(/inicio de rango|fin de rango/);
    expect(state.issues.join(" ")).toMatch(/fecha límite|RTN/);
  });
  it("una autorización completa está preparada y fin + 1 significa agotada", () => {
    expect(fiscalReadiness(authorized)).toMatchObject({ state: "ready", tieneRango: true, canIssue: true });
    expect(fiscalReadiness({ ...authorized, correlativo: 4 })).toMatchObject({ state: "exhausted", canIssue: false });
  });
  it("no emite fuera del rango ni sobre una serie distinta", () => {
    expect(fiscalReadiness({ ...authorized, correlativo: 5 }).canIssue).toBe(false);
    expect(fiscalBound("001-001-01-000000001", "999-999-01")).toBe(null);
    expect(fiscalBound("999-999-01-000000003", "999-999-01")).toBe(3);
    expect(fiscalNumber("999-999-01", 3)).toBe("999-999-01-000000003");
  });
  it.each(["1e2", 0, -1, 1.5, true, {}, [], "9007199254740992"])("rechaza correlativo ambiguo %j", correlativo => {
    expect(parseFiscalSettings({ ...authorized, correlativo }).errors.length).toBeGreaterThan(0);
  });
  it.each(["2026-02-30", "31/12/2099", "", "2099-13-01"])("rechaza vigencia inválida %s", fechaLimite => {
    expect(fiscalReadiness({ ...authorized, fechaLimite }).canIssue).toBe(false);
  });
  it("el último día se evalúa en Honduras, no en UTC", () => {
    const atNight = new Date("2026-11-01T03:00:00Z");
    expect(hondurasDay(atNight)).toBe("2026-10-31");
    expect(fiscalReadiness({ ...authorized, fechaLimite: "2026-10-31" }, atNight).state).toBe("ready");
    expect(fiscalReadiness({ ...authorized, fechaLimite: "2026-10-30" }, atNight).state).toBe("expired");
  });
  it("la proyección de Ventas no devuelve CAI, RTN, correlativo ni revisión", () => {
    const runtime = fiscalRuntimeConfig({ ...authorized, revision: "privada" });
    expect(runtime).toMatchObject({ state: "ready", tieneRango: true });
    for (const field of ["cai", "serie", "nit", "nombre", "direccion", "correlativo", "revision"]) expect(runtime).not.toHaveProperty(field);
  });
  it("la instantánea tiene campos explícitos, sin credenciales o configuración ajena", () => {
    const snapshot = fiscalIssuerSnapshot({ ...authorized, SMTP_PASS: "NO COPIAR", sessionSecret: "NO COPIAR", email: "qa@arconet.local", phone: "QA" });
    expect(snapshot.version).toBe(1); expect(snapshot.nombre).toBe(authorized.nombre);
    expect(JSON.stringify(snapshot)).not.toMatch(/NO COPIAR|SMTP_PASS|sessionSecret/);
  });
  it("configuración ausente no genera identidad ni numeración", () => {
    const config = fiscalConfigFromRows([]);
    expect(config.cai).toBe(""); expect(config.nit).toBe(""); expect(config.correlativo).toBe(null);
  });
});
