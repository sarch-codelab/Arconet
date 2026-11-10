import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { readDockMenu, saveDockMenu } from "../lib/dock-menu-service";
import { defaultDockMenu, DOCK_MENU_KEY, HERO_MENU_KEY } from "../lib/dock-menu";

function database() {
  const rows = new Map();
  return { configuracionSistema: {
    findUnique: async ({ where }) => rows.has(where.clave) ? { valor: rows.get(where.clave) } : null,
    create: async ({ data }) => { if (rows.has(data.clave)) throw Object.assign(new Error(), { code: "P2002" }); rows.set(data.clave, data.valor); },
    updateMany: async ({ where, data }) => { if (rows.get(where.clave) !== where.valor) return { count: 0 }; rows.set(where.clave, data.valor); return { count: 1 }; },
  } };
}

describe("menú 1 independiente", () => {
  it("guarda y restaura el menú 1 sin modificar el menú 2", async () => {
    const db = database(), first = await readDockMenu(db, HERO_MENU_KEY), second = await readDockMenu(db, DOCK_MENU_KEY);
    first.menu.items[0].label = "Portada del hero";
    const saved = await saveDockMenu(first.menu, first.revision, db, HERO_MENU_KEY);
    expect((await readDockMenu(db, HERO_MENU_KEY)).menu.items[0].label).toBe("Portada del hero");
    expect((await readDockMenu(db, DOCK_MENU_KEY)).menu).toEqual(second.menu);
    await expect(saveDockMenu(first.menu, first.revision, db, HERO_MENU_KEY)).rejects.toMatchObject({ status: 409 });
    await saveDockMenu(defaultDockMenu(), saved.revision, db, HERO_MENU_KEY);
    expect((await readDockMenu(db, HERO_MENU_KEY)).menu).toEqual(defaultDockMenu());
  });
  it("no guarda destinos inválidos", async () => {
    const db = database(), result = await readDockMenu(db, HERO_MENU_KEY);
    result.menu.items[0].href = "javascript:alert(1)";
    await expect(saveDockMenu(result.menu, result.revision, db, HERO_MENU_KEY)).rejects.toMatchObject({ status: 400 });
  });
});

const mocked = vi.hoisted(() => ({ permissions: [], session: true, read: vi.fn(), save: vi.fn(), log: vi.fn() }));
vi.mock("../lib/dal", () => ({ requirePermission: async permission => !mocked.session ? { response: Response.json({}, { status: 401 }) } : mocked.permissions.includes(permission) ? { session: { correo: "qa@local" }, permisos: mocked.permissions } : { response: Response.json({}, { status: 403 }) } }));
vi.mock("../lib/logs", () => ({ writeLog: mocked.log }));
// Los permisos se comprueban con el servicio real; las peticiones prohibidas no acceden a él.
import { GET, PUT } from "../app/api/configuracion/menu-navegacion-1/route";
const request = () => new Request("https://example.test", { method: "PUT", body: JSON.stringify({ menu: {}, revision: "x" }) });
beforeEach(() => { mocked.session = true; mocked.permissions = []; });
describe("permisos del menú 1", () => {
  it("requiere sesión para leer", async () => { mocked.session = false; expect((await GET()).status).toBe(401); });
  it.each([[], ["ajustes:read"], ["ajustes:write"]].map((permissions) => [permissions]))("requiere lectura y escritura para guardar (%j)", async (permissions) => { mocked.permissions = permissions; expect((await PUT(request())).status).toBe(403); });
});
