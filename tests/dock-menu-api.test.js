import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ permissions: [], session: true, read: vi.fn(), save: vi.fn(), log: vi.fn() }));
vi.mock("../lib/dal", () => ({ requirePermission: async permission => !m.session ? { response: Response.json({}, { status: 401 }) } : m.permissions.includes(permission) ? { session: { correo: "qa@local" }, permisos: m.permissions } : { response: Response.json({}, { status: 403 }) } }));
vi.mock("../lib/dock-menu-service", () => ({ readDockMenu: m.read, saveDockMenu: m.save }));
vi.mock("../lib/logs", () => ({ writeLog: m.log }));
import { GET, PUT } from "../app/api/configuracion/menu-navegacion/route";
const req = body => new Request("https://arconet.test/api/configuracion/menu-navegacion", { method: "PUT", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); m.permissions = []; m.session = true; m.read.mockResolvedValue({ menu: {}, revision: "r", raw: "secret", corrupt: false }); m.save.mockResolvedValue({ menu: {}, revision: "r2" }); });
describe("permisos del editor del menú", () => {
  it("sin sesión o lectura no entrega configuración", async () => { m.session = false; expect((await GET()).status).toBe(401); m.session = true; expect((await GET()).status).toBe(403); expect(m.read).not.toHaveBeenCalled(); });
  it.each([[], ["ajustes:read"], ["ajustes:write"]].map(p => [p]))("sin permisos completos %j no guarda", async (p) => { m.permissions = p; expect((await PUT(req({ menu: {}, revision: "r" }))).status).toBe(403); expect(m.save).not.toHaveBeenCalled(); });
  it("con ambos permisos guarda y audita, sin exponer el valor original", async () => { m.permissions = ["ajustes:read", "ajustes:write"]; expect(await (await GET()).json()).not.toHaveProperty("raw"); expect((await PUT(req({ menu: {}, revision: "r" }))).status).toBe(200); expect(m.save).toHaveBeenCalledWith({}, "r"); expect(m.log).toHaveBeenCalled(); });
  it("notifica conflictos sin ocultarlos", async () => { m.permissions = ["ajustes:read", "ajustes:write"]; m.save.mockRejectedValue(Object.assign(new Error("Cambio concurrente"), { status: 409 })); const res = await PUT(req({ menu: {}, revision: "r" })); expect(res.status).toBe(409); });
});
