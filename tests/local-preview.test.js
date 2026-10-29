import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalPreview, normalizeAdminLogin } from "../lib/local-preview";
import { assertLocalDatabase } from "../ops/local-database.mjs";

const localEnv = {
  NODE_ENV: "development",
  NEXT_PUBLIC_LOCAL_PREVIEW: "1",
  DATABASE_URL: "postgresql://arconet_local:test@127.0.0.1:55432/arconet_local?schema=public",
};
afterEach(() => vi.unstubAllEnvs());

describe("cuentas locales de demostración", () => {
  it("habilita admin como alias solo con el modo local explícito", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "1");
    expect(isLocalPreview()).toBe(true);
    expect(normalizeAdminLogin(" ADMIN ")).toBe("admin@arconet.local");
    expect(normalizeAdminLogin(" Otro@Ejemplo.com ")).toBe("otro@ejemplo.com");
  });
  it("no habilita el alias en producción aunque se configure la bandera", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "1");
    expect(isLocalPreview()).toBe(false);
    expect(normalizeAdminLogin("admin")).toBe("admin");
  });
  it("no cambia el desarrollo normal sin la bandera", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "");
    expect(normalizeAdminLogin("admin")).toBe("admin");
  });
  it("normaliza entradas inválidas y limita la longitud", () => {
    expect(normalizeAdminLogin(null)).toBe("");
    expect(normalizeAdminLogin({ email: "admin" })).toBe("");
    expect(normalizeAdminLogin("a".repeat(400))).toHaveLength(254);
  });
});

describe("aislamiento del seed local", () => {
  it("acepta únicamente el destino local esperado", () => {
    expect(() => assertLocalDatabase(localEnv)).not.toThrow();
  });
  it.each(["production", "test"])("rechaza NODE_ENV=%s", (NODE_ENV) => {
    expect(() => assertLocalDatabase({ ...localEnv, NODE_ENV })).toThrow();
  });
  it("requiere habilitación explícita", () => {
    expect(() => assertLocalDatabase({ ...localEnv, NEXT_PUBLIC_LOCAL_PREVIEW: "" })).toThrow();
  });
  it.each([
    "postgresql://arconet_local:test@192.0.2.10:55432/arconet_local",
    "postgresql://arconet_local:test@127.0.0.1:5432/arconet_local",
    "postgresql://arconet_local:test@127.0.0.1:55432/arconet",
    "postgresql://postgres:test@127.0.0.1:55432/arconet_local",
    "https://arconet_local:test@127.0.0.1:55432/arconet_local",
  ])("rechaza destinos no aislados: %s", (DATABASE_URL) => {
    expect(() => assertLocalDatabase({ ...localEnv, DATABASE_URL })).toThrow();
  });
});
