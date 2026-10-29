import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalPreviewToken, isLocalPreviewAuthEnabled } from "../lib/local-preview-auth";
import { createToken, verifyToken } from "../lib/session";

const local = {
  NODE_ENV: "development", NEXT_PUBLIC_LOCAL_PREVIEW: "1",
  DATABASE_URL: "postgresql://arconet_local:prueba@127.0.0.1:55432/arconet_local?schema=public",
};
beforeEach(() => {
  for (const [key, value] of Object.entries(local)) vi.stubEnv(key, value);
  vi.stubEnv("SESSION_SECRET", "secreto-ficticio-de-pruebas-32-caracteres-minimo");
});
afterEach(() => vi.unstubAllEnvs());

describe("autenticación sin cookies exclusiva de la demo", () => {
  it("solo habilita la base aislada con flags de desarrollo", () => {
    expect(isLocalPreviewAuthEnabled(local)).toBe(true);
  });
  it.each([
    { NODE_ENV: "production" }, { NODE_ENV: "test" }, { NEXT_PUBLIC_LOCAL_PREVIEW: "" },
    { DATABASE_URL: "postgresql://arconet_local:prueba@192.0.2.10:55432/arconet_local" },
    { DATABASE_URL: "postgresql://arconet_local:prueba@127.0.0.1:5432/arconet_local" },
    { DATABASE_URL: "postgresql://arconet_local:prueba@127.0.0.1:55432/produccion" },
    { DATABASE_URL: "postgresql://postgres:prueba@127.0.0.1:55432/arconet_local" },
    { DATABASE_URL: local.DATABASE_URL + "&host=remoto.example" },
    { DATABASE_URL: local.DATABASE_URL + "&options=otro-destino" },
    { DATABASE_URL: "inválida" },
  ])("rechaza una configuración fuera de la demo: %j", override => {
    expect(isLocalPreviewAuthEnabled({ ...local, ...override })).toBe(false);
  });
  it("lee únicamente la cabecera explícita de la demo", () => {
    expect(getLocalPreviewToken(new Headers({ "X-Arconet-Preview-Session": "payload.firma" }))).toBe("payload.firma");
    expect(getLocalPreviewToken(new Headers({ Authorization: "Bearer payload.firma" }))).toBe(null);
    expect(getLocalPreviewToken(new Headers())).toBe(null);
  });
  it("ignora la cabecera en producción aunque exista un token", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getLocalPreviewToken(new Headers({ "X-Arconet-Preview-Session": "payload.firma" }))).toBe(null);
  });
  it.each(["admin", "a.b.c", "abc", "a." + "x".repeat(8192)])("rechaza cabeceras no válidas", value => {
    expect(getLocalPreviewToken(new Headers({ "X-Arconet-Preview-Session": value }))).toBe(null);
  });
  it("requiere una firma real y rechaza tokens modificados o caducados", async () => {
    const { token } = await createToken({ id: "usuario-de-prueba", correo: "admin@arconet.local", rol: "administrador" });
    expect((await verifyToken(token)).sub).toBe("usuario-de-prueba");
    const [payload] = token.split(".");
    expect(await verifyToken(payload + ".firma-inventada")).toBe(null);
    const expired = await createToken({ id: "usuario-de-prueba" }, -1);
    expect(await verifyToken(expired.token)).toBe(null);
  });
});
