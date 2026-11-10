import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ permissions: [], session: true, upsert: vi.fn(), read: vi.fn(), log: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { configuracionSistema: { upsert: m.upsert } } }));
vi.mock("../lib/dal", () => ({ requirePermission: async p => !m.session ? { response: Response.json({}, { status: 401 }) } : m.permissions.includes(p) ? { session: { correo: "qa@arconet.local" }, permisos: m.permissions, response: null } : { response: Response.json({}, { status: 403 }) } }));
vi.mock("../lib/public-pages-service", () => ({ readPublicPages: m.read }));
vi.mock("../lib/logs", () => ({ writeLog: m.log }));
import { GET, PATCH } from "../app/api/configuracion/paginas/route";
const req = body => new Request("https://arconet.test/api/configuracion/paginas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); m.permissions = []; m.session = true; m.read.mockResolvedValue({ tienda: true }); m.upsert.mockResolvedValue({}); });
describe("control de disponibilidad en Ajustes", () => {
  it("requiere sesión y lectura para consultar", async () => {
    m.session = false; expect((await GET()).status).toBe(401); m.session = true;
    expect((await GET()).status).toBe(403); expect(m.read).not.toHaveBeenCalled();
    m.permissions = ["ajustes:read"]; const response = await GET(); expect(response.status).toBe(200); expect(await response.json()).toEqual({ pages: { tienda: true } });
  });
  it.each([[], ["ajustes:read"], ["ajustes:write"]].map(p => [p]))("exige lectura y escritura, no permite %j", async (permissions) => {
    m.permissions = permissions; expect((await PATCH(req({ id: "tienda", enabled: false }))).status).toBe(403); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("valida las páginas y el booleano y registra cambios autorizados", async () => {
    m.permissions = ["ajustes:read", "ajustes:write"];
    expect((await PATCH(req({ id: "admin", enabled: false }))).status).toBe(400);
    expect((await PATCH(req({ id: "tienda", enabled: "false" }))).status).toBe(400);
    expect(m.upsert).not.toHaveBeenCalled();
    const response = await PATCH(req({ id: "tienda", enabled: false })); expect(response.status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith({ where: { clave: "pagina.publica.tienda" }, create: { clave: "pagina.publica.tienda", valor: "false" }, update: { valor: "false" } });
    expect(m.log).toHaveBeenCalledWith("panel", expect.stringContaining("Desactivó"), expect.objectContaining({ actor: "qa@arconet.local" }));
    expect((await PATCH(req({ id: "tienda", enabled: true }))).status).toBe(200);
  });
  it("si falla la base de datos no informa éxito", async () => {
    m.permissions = ["ajustes:read", "ajustes:write"]; m.upsert.mockRejectedValue(new Error("fallo"));
    expect((await PATCH(req({ id: "tienda", enabled: false }))).status).toBe(503);
  });
});
