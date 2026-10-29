import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, clientApiFetch, clearLocalPreviewSession, getLocalPreviewSession, rememberLocalPreviewSession } from "../lib/api-fetch";

let stored;
let storage;
let request;
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_PREVIEW", "1");
  stored = new Map();
  storage = { getItem: vi.fn(key => stored.get(key) || null), setItem: vi.fn((key, value) => stored.set(key, value)), removeItem: vi.fn(key => stored.delete(key)) };
  vi.stubGlobal("window", { location: new URL("https://preview.example.test/panel-administrativo"), sessionStorage: storage });
  request = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", request);
});
afterEach(() => {
  clearLocalPreviewSession("admin");
  clearLocalPreviewSession("cliente");
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("transporte de sesión local", () => {
  it("añade la sesión firmada solo a las APIs del mismo origen", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    await apiFetch("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("/api/productos");
    expect(init.headers.get("X-Arconet-Preview-Session")).toBe("payload.firma");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe("{}");
  });
  it.each(["https://externo.example/api/productos", "//externo.example/api/productos", "/arconet.png"])("no filtra la sesión a %s", async url => {
    rememberLocalPreviewSession("admin", "payload.firma");
    await apiFetch(url);
    expect(request.mock.calls[0][1]).toBeUndefined();
  });
  it("no activa el transporte en producción", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    vi.stubEnv("NODE_ENV", "production");
    await apiFetch("/api/productos");
    expect(request.mock.calls[0][1]).toBeUndefined();
  });
  it("separa la sesión del cliente de la del administrador", async () => {
    rememberLocalPreviewSession("admin", "admin.firma");
    rememberLocalPreviewSession("cliente", "cliente.firma");
    await apiFetch("/api/ordenes");
    await clientApiFetch("/api/ordenes");
    expect(request.mock.calls[0][1].headers.get("X-Arconet-Preview-Session")).toBe("admin.firma");
    expect(request.mock.calls[1][1].headers.get("X-Arconet-Preview-Session")).toBe("cliente.firma");
  });
  it("conserva las cabeceras de un Request sin modificarlo", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    const source = new Request("https://preview.example.test/api/productos", { headers: { Accept: "application/json" } });
    await apiFetch(source);
    expect(request.mock.calls[0][1].headers.get("Accept")).toBe("application/json");
    expect(source.headers.has("X-Arconet-Preview-Session")).toBe(false);
  });
  it("no sobreescribe una sesión explícita ni credenciales omitidas", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    await apiFetch("/api/productos", { headers: { "X-Arconet-Preview-Session": "otra.firma" } });
    expect(request.mock.calls[0][1].headers.get("X-Arconet-Preview-Session")).toBe("otra.firma");
    await apiFetch("/api/productos", { credentials: "omit" });
    expect(request.mock.calls[1][1]).toEqual({ credentials: "omit" });
  });
  it("usa la memoria de la pestaña si se bloquea sessionStorage", async () => {
    storage.setItem.mockImplementation(() => { throw new Error("Storage bloqueado"); });
    storage.getItem.mockImplementation(() => { throw new Error("Storage bloqueado"); });
    rememberLocalPreviewSession("admin", "payload.firma");
    await apiFetch("/api/productos");
    expect(request.mock.calls[0][1].headers.get("X-Arconet-Preview-Session")).toBe("payload.firma");
  });
  it("elimina la sesión de storage y memoria al salir", () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    clearLocalPreviewSession("admin");
    expect(getLocalPreviewSession("admin")).toBe(null);
    expect(stored.size).toBe(0);
  });
  it("no almacena tokens malformados", () => {
    rememberLocalPreviewSession("admin", "sin-firma");
    expect(getLocalPreviewSession("admin")).toBe(null);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("no cambia las peticiones fuera del navegador", async () => {
    vi.stubGlobal("window", undefined);
    await apiFetch("/api/productos");
    expect(request.mock.calls[0][1]).toBeUndefined();
  });
  it("no reintenta ni oculta errores de red", async () => {
    rememberLocalPreviewSession("admin", "payload.firma");
    request.mockRejectedValue(new Error("Sin conexión"));
    await expect(apiFetch("/api/productos")).rejects.toThrow("Sin conexión");
    expect(request).toHaveBeenCalledOnce();
  });
});
