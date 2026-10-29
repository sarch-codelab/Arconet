import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionCookieOptions } from "../lib/session-cookie";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "1");
  vi.stubEnv("APP_ORIGIN", "https://3000-prueba.e2b.app");
});
afterEach(() => vi.unstubAllEnvs());

describe("cookies de sesión de la demo local", () => {
  it("permite la sesión HTTPS en iframe con una cookie particionada", () => {
    expect(sessionCookieOptions(3600)).toEqual({ httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: 3600 });
  });
  it("cierra la sesión en la misma partición", () => {
    expect(sessionCookieOptions(0)).toMatchObject({ maxAge: 0, partitioned: true, secure: true });
  });
  it("mantiene las protecciones de producción aunque quede la bandera local", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieOptions(3600)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 });
  });
  it("no cambia el desarrollo normal sin modo local", () => {
    vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "");
    expect(sessionCookieOptions(60)).toEqual({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 60 });
  });
  it.each(["", "no-es-url", "http://3000-prueba.e2b.app", "http://localhost:3000", "https://arconet.example", "https://prueba.e2b.app.example"])("no habilita cookies de iframe para %s", (origin) => {
    vi.stubEnv("APP_ORIGIN", origin);
    expect(sessionCookieOptions(60)).toEqual({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 60 });
  });
});
