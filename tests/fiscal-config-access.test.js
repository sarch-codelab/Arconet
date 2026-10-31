import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ permissions: [], session: true, load: vi.fn(), save: vi.fn(), db: {} }));
vi.mock("../lib/prisma", () => ({ prisma: m.db }));
vi.mock("../lib/dal", () => ({
  requireSession: async () => m.session ? { session: { correo: "qa@arconet.local" }, response: null } : { response: Response.json({}, { status: 401 }) },
  getPermisos: async () => m.permissions,
  requirePermission: async permission => !m.session ? { response: Response.json({}, { status: 401 }) } : m.permissions.includes(permission) ? { session: { correo: "qa@arconet.local" }, permisos: m.permissions, response: null } : { response: Response.json({}, { status: 403 }) },
}));
vi.mock("../lib/fiscal-settings-service", () => ({ loadFiscalSettings: m.load, saveFiscalSettings: m.save }));
import { GET, PUT } from "../app/api/facturacion/config/route";
const req = data => new Request("https://arconet.test/api/facturacion/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
beforeEach(() => { vi.clearAllMocks();m.permissions=[];m.session=true;m.load.mockResolvedValue({ cai: "QA", serie: "999-999-01", correlativo: 1, nit: "00000000000000", nombre: "QA", direccion: "QA", revision: "revision", state: "incomplete" });m.save.mockResolvedValue({ ok: true }); });
describe("configuración sensible exclusivamente en Ajustes", () => {
  it.each([[], ["facturacion:write"], ["facturacion:read", "facturacion:write"], ["facturacion:read", "facturacion:emit"], ["ajustes:read"], ["ajustes:write"]].map(p=>[p]))("no concede escritura fiscal con %j", async permissions => {
    m.permissions=permissions;expect((await PUT(req({}))).status).toBe(403);expect(m.save).not.toHaveBeenCalled();
  });
  it("Ajustes lectura/escritura permite configurar sin necesitar facturación", async () => {
    m.permissions=["ajustes:read","ajustes:write"];expect((await PUT(req({ revision: "r" }))).status).toBe(200);expect(m.save).toHaveBeenCalledWith(m.db,{ revision:"r" },"qa@arconet.local");
  });
  it("Ajustes lectura obtiene el formulario completo", async () => {
    m.permissions=["ajustes:read"];const r=await GET();expect(r.status).toBe(200);expect(await r.json()).toHaveProperty("revision","revision");
  });
  it("Facturación sólo recibe diagnóstico, sin valores editables", async () => {
    m.permissions=["facturacion:read"];const data=await(await GET()).json();expect(data).toHaveProperty("canIssue",false);for(const field of["cai","serie","correlativo","nit","revision"])expect(data).not.toHaveProperty(field);
  });
  it("sin lecturas autorizadas no consulta la configuración", async () => {
    expect((await GET()).status).toBe(403);expect(m.load).not.toHaveBeenCalled();
  });
  it("sin sesión no lee ni escribe", async () => {
    m.session=false;expect((await GET()).status).toBe(401);expect((await PUT(req({}))).status).toBe(401);expect(m.load).not.toHaveBeenCalled();expect(m.save).not.toHaveBeenCalled();
  });
  it("los conflictos se comunican sin cambios parciales o errores internos", async () => {
    m.permissions=["ajustes:read","ajustes:write"];m.save.mockRejectedValue(Object.assign(new Error("El correlativo cambió"),{status:409}));const r=await PUT(req({}));expect(r.status).toBe(409);expect(await r.json()).toEqual({error:"El correlativo cambió"});
  });
});
