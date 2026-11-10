import { afterEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { configuracionSistema: { findMany: m.query } } }));
afterEach(() => { vi.useRealTimers(); vi.resetModules(); vi.clearAllMocks(); });
describe("lectura pública de disponibilidad", () => {
  it("limita consultas y conserva el último estado si la base falla", async () => {
    vi.useFakeTimers(); m.query.mockResolvedValueOnce([{ clave: "pagina.publica.tienda", valor: "false" }]).mockRejectedValueOnce(new Error("offline"));
    const { cachedPublicPages } = await import("../lib/public-pages-service");
    const first = await cachedPublicPages(); expect(first.tienda).toBe(false);
    await cachedPublicPages(); expect(m.query).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5001); const previous = await cachedPublicPages(); expect(previous.tienda).toBe(false);
    expect(m.query).toHaveBeenCalledTimes(2);
  });
  it("si no hay ningún estado conocido no bloquea el sitio por caída de BD", async () => {
    m.query.mockRejectedValueOnce(new Error("offline")); const { cachedPublicPages } = await import("../lib/public-pages-service");
    expect((await cachedPublicPages()).catalogo).toBe(true);
  });
});
