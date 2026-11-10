import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permissions: [], session: true, read: vi.fn(), save: vi.fn(), log: vi.fn() }));
vi.mock("../lib/dal", () => ({ requirePermission: async permission => !mocks.session ? { response: Response.json({}, { status: 401 }) } : mocks.permissions.includes(permission) ? { session: { correo: "qa@local" }, permisos: mocks.permissions } : { response: Response.json({}, { status: 403 }) } }));
vi.mock("../lib/dock-menu-service", () => ({ readDockMenu: mocks.read, saveDockMenu: mocks.save }));
vi.mock("../lib/logs", () => ({ writeLog: mocks.log }));
import { HERO_MENU_KEY } from "../lib/dock-menu";
import { GET, PUT } from "../app/api/configuracion/menu-navegacion-1/route";
import { GET as PUBLIC_GET } from "../app/api/menu-navegacion-1/route";
import { defaultDockMenu } from "../lib/dock-menu";
const request = body => new Request("https://example.test", { method: "PUT", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.permissions = ["ajustes:read", "ajustes:write"]; mocks.session = true; mocks.read.mockResolvedValue({ menu: defaultDockMenu(), revision: "r", raw: "no exponer", corrupt: false }); mocks.save.mockResolvedValue({ menu: defaultDockMenu(), revision: "nuevo" }); });
describe("API menú 1", () => {
  it("consulta y guarda usando solo la clave del menú 1 y audita", async () => {
    const result = await GET(); expect(result.status).toBe(200); expect(await result.json()).not.toHaveProperty("raw"); expect(mocks.read).toHaveBeenCalledWith(undefined, HERO_MENU_KEY);
    const save = await PUT(request({ menu: {}, revision: "r" })); expect(save.status).toBe(200); expect(mocks.save).toHaveBeenCalledWith({}, "r", undefined, HERO_MENU_KEY); expect(mocks.log).toHaveBeenCalled();
  });
  it("el endpoint público omite elementos ocultos", async () => {
    const menu = defaultDockMenu(); menu.items[0].enabled = false; menu.items[1].groups[0].links[0].enabled = false;
    mocks.read.mockResolvedValue({ menu }); const result = await PUBLIC_GET(); const body = await result.json();
    expect(mocks.read).toHaveBeenCalledWith(undefined, HERO_MENU_KEY); expect(body.menu.items.some(i => i.label === "Inicio")).toBe(false); expect(body.menu.items[0].megaGroups[0].links).toHaveLength(4); expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("devuelve conflictos de edición y errores de lectura", async () => {
    mocks.save.mockRejectedValue(Object.assign(new Error("Conflicto"), { status: 409 })); expect((await PUT(request({ menu: {}, revision: "r" }))).status).toBe(409);
    mocks.read.mockRejectedValue(new Error("error")); expect((await PUBLIC_GET()).status).toBe(503);
  });
});
