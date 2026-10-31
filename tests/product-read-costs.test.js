import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SALES_PERMISSIONS } from "../lib/roles-defaults";
import { ALL_PERMISSIONS } from "../lib/permisos";
const m = vi.hoisted(() => ({ permissions: [], authenticated: true, many: vi.fn(), one: vi.fn(), effective: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { producto: { findMany: m.many, findUnique: m.one } } }));
vi.mock("../lib/dal", () => ({
  requireSession: async () => m.authenticated ? { session: { rol: "ventas" }, response: null } : { response: Response.json({}, { status: 401 }) },
  getPermisos: m.effective,
  requirePermission: vi.fn(),
}));
vi.mock("../lib/logs", () => ({ writeLog: vi.fn() }));
import { GET as list } from "../app/api/productos/route";
import { GET as detail } from "../app/api/productos/[id]/route";
const product = { id: "qa", nombre: "Producto", sku: "SKU", precio: 100, precioDescuento: 90, precioMayorista: 80, costo: 33, stock: 20 };
const req = () => new Request("https://arconet.test/api/productos?q=SKU");
const params = () => ({ params: Promise.resolve({ id: "qa" }) });
beforeEach(() => {
  vi.clearAllMocks(); m.authenticated = true; m.permissions = [...DEFAULT_SALES_PERMISSIONS];
  m.effective.mockImplementation(async () => m.permissions);
  m.many.mockResolvedValue([product]); m.one.mockResolvedValue(product);
});

describe("lectura del catálogo sin exponer costo a Ventas", () => {
  it.each([DEFAULT_SALES_PERMISSIONS, ["productos:read"], ["precios:read", "precios:write"], ["inventario:read"], []].map(permissions => [permissions]))("conserva GET 200 y tarifas, pero no costo, para %j", async permissions => {
    m.permissions = permissions;
    const rows = await list(req());
    expect(rows.status).toBe(200);
    expect(rows.headers.get("Cache-Control")).toBe("private, no-store");
    const [item] = await rows.json();
    expect(item).not.toHaveProperty("costo");
    expect(item).toMatchObject({ precio: 100, precioDescuento: 90, precioMayorista: 80, stock: 20 });
    expect(m.many.mock.calls[0][0].select.costo).toBe(false);
    const one = await detail(req(), params());
    expect(one.status).toBe(200);
    expect(await one.json()).not.toHaveProperty("costo");
  });
  it.each([["compras:read"], ["productos:write"], ALL_PERMISSIONS].map(permissions => [permissions]))("conserva el costo para compras/mantenimiento autorizado: %j", async permissions => {
    m.permissions = permissions;
    expect((await (await list(req())).json())[0].costo).toBe(33);
    expect((await (await detail(req(), params())).json()).costo).toBe(33);
    expect(m.many.mock.calls[0][0].select.costo).toBe(true);
  });
  it("sin sesión mantiene 401 y no consulta catálogo ni permisos", async () => {
    m.authenticated = false;
    expect((await list(req())).status).toBe(401);
    expect((await detail(req(), params())).status).toBe(401);
    expect(m.many).not.toHaveBeenCalled(); expect(m.effective).not.toHaveBeenCalled();
  });
  it("mantiene el 404 de un SKU inexistente", async () => {
    m.one.mockResolvedValue(null);
    expect((await detail(req(), params())).status).toBe(404);
  });
});
