import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ cached: vi.fn() }));
vi.mock("../lib/public-pages-service", () => ({ cachedPublicPages: m.cached }));
import proxy from "../proxy";
const request = path => new NextRequest(`https://arconet.test${path}`);
beforeEach(() => { m.cached.mockReset(); m.cached.mockResolvedValue({ catalogo: false, tienda: true, contacto: false }); });
describe("bloqueo temporal de páginas públicas", () => {
  it("redirige páginas y subpáginas desactivadas con respuesta temporal no cacheable", async () => {
    for (const path of ["/catalogo", "/catalogo/ficha/otdr", "/contacto"]) {
      const response = await proxy(request(path));
      expect(response.status).toBe(307); expect(response.headers.get("location")).toContain("/pagina-no-disponible?pagina="); expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });
  it("mantiene rutas activas y recursos estáticos disponibles", async () => {
    const r = await proxy(request("/tienda/producto/abc")); expect(r.headers.get("x-middleware-next")).toBe("1"); expect(r.headers.get("cache-control")).toBe("no-store");
    m.cached.mockClear(); const asset = await proxy(request("/catalogo/lineas/cards/pasivos.webp")); expect(asset.headers.get("x-middleware-next")).toBe("1"); expect(m.cached).not.toHaveBeenCalled();
  });
});
