import { describe, expect, it, vi } from "vitest";
import { loadClientPortal } from "../lib/client-portal-load";
import { readFileSync } from "node:fs";

const json = (data, status = 200) => Response.json(data, { status });
const session = { clienteId: "c-1", nombre: "Cliente" };

describe("carga del portal de clientes", () => {
  it("carga sesión y solicitudes con cancelación y sin caché", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json([]));
    const signal = new AbortController().signal;
    expect(await loadClientPortal(fetcher, signal)).toEqual({ session, orders: [] });
    expect(fetcher).toHaveBeenNthCalledWith(1, "/api/cliente-auth/session", { cache: "no-store", signal });
    expect(fetcher).toHaveBeenNthCalledWith(2, "/api/ordenes", { cache: "no-store", signal });
  });

  it("no solicita órdenes sin una sesión autenticada", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}, 401));
    expect(await loadClientPortal(fetcher)).toEqual({ unauthenticated: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("detecta una sesión que expira entre ambas consultas", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({}, 401));
    expect(await loadClientPortal(fetcher)).toEqual({ unauthenticated: true });
  });

  it("conserva el error del servidor en vez de simular una lista vacía", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({ error: "Servicio temporalmente no disponible" }, 503));
    await expect(loadClientPortal(fetcher)).rejects.toThrow("Servicio temporalmente no disponible");
  });

  it.each([{}, null, { ok: true }])("rechaza listas inválidas: %j", async (payload) => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json(payload));
    await expect(loadClientPortal(fetcher)).rejects.toThrow("respuesta de solicitudes no es válida");
  });

  it("rechaza respuestas HTML en lugar de dar por válida una cuenta", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("<html>Error proxy</html>"));
    await expect(loadClientPortal(fetcher)).rejects.toThrow("No se pudo verificar la cuenta");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("propaga los fallos de conexión sin reintentos automáticos", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(loadClientPortal(fetcher)).rejects.toThrow("Failed to fetch");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("presenta carga, recuperación y protege las acciones simultáneas", () => {
    const source = readFileSync("app/cliente/cliente-experience.js", "utf8");
    expect(source).toContain('role="status">Cargando tu cuenta');
    expect(source).toContain("Volver a intentar");
    expect(source).toContain("controller.abort()");
    expect(source).toContain("if (actionInFlight.current) return");
    expect(source.match(/disabled=\{actionSaving\}/g)).toHaveLength(3);
    expect(source).toContain("Volver a cargar tickets");
    const css = readFileSync("app/cliente/cliente-experience.module.css", "utf8");
    expect(css).toMatch(/\.brandArea \.logo img\s*\{[^}]*height: auto/);
    expect(source).not.toContain(".catch(() => {})\n      .finally");
  });
});
