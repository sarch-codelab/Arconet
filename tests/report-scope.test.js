import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ permissions: [], products: vi.fn(), orders: vi.fn(), payments: vi.fn(), balance: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { producto: { findMany: m.products }, orden: { findMany: m.orders }, pago: { findMany: m.payments } } }));
vi.mock("../lib/dal", () => ({ requirePermission: async permission => m.permissions.includes(permission) ? { session: { rol: "qa" }, permisos: m.permissions, response: null } : { response: Response.json({}, { status: 403 }) } }));
vi.mock("../lib/ventas", () => ({ balanceVentas: m.balance }));
import { GET } from "../app/api/reportes/route";
const req = (reporte, format) => new Request(`https://arconet.test/api/reportes?reporte=${reporte}${format ? `&formato=${format}` : ""}`);
beforeEach(() => { vi.clearAllMocks(); m.permissions = ["reportes:read"]; m.products.mockResolvedValue([{ id: "p", nombre: "Producto", sku: "SKU", unidad: "Pieza", stock: 2, stockMinimo: 3, costo: 999, precio: 5000 }]); m.orders.mockResolvedValue([]); m.payments.mockResolvedValue([]); m.balance.mockResolvedValue({}); });
describe("Reportes no es una vía alterna para eludir el alcance del Resumen", () => {
  it.each(["ventas", "pagos", "inventario"])("Reportes solo no permite consultar el área %s", async type => {
    expect((await GET(req(type))).status).toBe(403); expect(m.products).not.toHaveBeenCalled(); expect(m.orders).not.toHaveBeenCalled(); expect(m.payments).not.toHaveBeenCalled();
  });
  it("Ventas no obtiene el reporte de costo de inventario", async () => {
    m.permissions = ["reportes:read", "ordenes:read", "productos:read", "precios:read"];
    expect((await GET(req("inventario"))).status).toBe(403); expect(m.products).not.toHaveBeenCalled();
  });
  it("ver el resumen operativo no otorga acceso a los reportes globales", async () => {
    m.permissions = ["inventario:read", "ordenes:read"];
    expect((await GET(req("ventas"))).status).toBe(403); expect((await GET(req("inventario"))).status).toBe(403);
  });
  it("stock autorizado sin costo omite costos, precios y valoración, no los convierte en cero", async () => {
    m.permissions = ["reportes:read", "inventario:read"];
    const r = await GET(req("inventario")); expect(r.status).toBe(200); const data = await r.json();
    expect(data).toMatchObject({ total: 1, enAlerta: 1 }); expect(data).not.toHaveProperty("valorizado");
    expect(data.filas[0]).not.toHaveProperty("costo"); expect(data.filas[0]).not.toHaveProperty("precio"); expect(data.filas[0]).not.toHaveProperty("valorizado");
    expect(m.products.mock.calls[0][0].select).toMatchObject({ costo: false, precio: false });
  });
  it.each(["csv", "xlsx"])("la exportación %s respeta la misma redacción de costos", async format => {
    m.permissions = ["reportes:read", "inventario:read"];
    const r = await GET(req("inventario", format)); expect(r.status).toBe(200);
    expect(await r.text()).not.toMatch(/Costo|Valorizado|999|5000/);
  });
  it("gestión de productos conserva el costo autorizado sin confundirlo con venta", async () => {
    m.permissions = ["reportes:read", "inventario:read", "productos:write", "productos:read"];
    const r = await GET(req("inventario")); const data = await r.json();
    expect(data.filas[0]).toMatchObject({ costo: 999, precio: 5000, valorizado: 1998 }); expect(data.valorizado).toBe(1998);
  });
  it("la lectura de órdenes mantiene los reportes comerciales autorizados", async () => {
    m.permissions = ["reportes:read", "ordenes:read"];
    expect((await GET(req("ventas"))).status).toBe(200); expect(m.balance).toHaveBeenCalledOnce();
    expect((await GET(req("pagos"))).status).toBe(200);
  });
});
