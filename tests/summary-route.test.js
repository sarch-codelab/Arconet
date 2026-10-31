import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), permissions: vi.fn(), summary: vi.fn(), db: {} }));
vi.mock("../lib/dal", () => ({ requireSession: m.session, getPermisos: m.permissions }));
vi.mock("../lib/prisma", () => ({ prisma: m.db }));
vi.mock("../lib/admin-summary-service", () => ({ getAdminSummary: m.summary }));
import { GET } from "../app/api/resumen/route";
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ session: { id: "u", rol: "personalizado" }, response: null }); m.permissions.mockResolvedValue(["productos:read"]); m.summary.mockResolvedValue({ groups: [], links: [], inventory: false }); });
describe("API autenticada de Resumen", () => {
  it("sin sesión mantiene 401 y no consulta permisos ni indicadores", async () => {
    m.session.mockResolvedValue({ response: Response.json({}, { status: 401 }) });
    expect((await GET()).status).toBe(401); expect(m.permissions).not.toHaveBeenCalled(); expect(m.summary).not.toHaveBeenCalled();
  });
  it.each([[], ["ordenes:write"], ["mi-perfil:read"]].map(perms => [perms]))("sin lecturas efectivas responde 403 para %j", async permisos => {
    m.permissions.mockResolvedValue(permisos); expect((await GET()).status).toBe(403); expect(m.summary).not.toHaveBeenCalled();
  });
  it("cualquier lectura legítima admite el resumen, sin requerir reportes globales", async () => {
    const response = await GET(); expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(m.summary).toHaveBeenCalledWith(m.db, { id: "u", rol: "personalizado" }, ["productos:read"]);
  });
  it("relee permisos de la base en cada llamada y respeta una revocación", async () => {
    expect((await GET()).status).toBe(200); m.permissions.mockResolvedValue([]); expect((await GET()).status).toBe(403);
    expect(m.summary).toHaveBeenCalledOnce(); expect(m.permissions).toHaveBeenCalledTimes(2);
  });
  it("los permisos de query o body nunca se usan como autorización", async () => {
    m.permissions.mockResolvedValue([]);
    expect((await GET(new Request("https://arconet.test/api/resumen?permisos=reportes:read"))).status).toBe(403);
    expect(m.summary).not.toHaveBeenCalled();
  });
  it("un fallo se informa como 503 sin exponer detalles internos ni devolver ceros", async () => {
    m.summary.mockRejectedValue(new Error("detalle privado de la conexión"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try { const r = await GET(); expect(r.status).toBe(503); expect(await r.text()).not.toMatch(/detalle privado|"groups"|password|DATABASE_URL/); }
    finally { spy.mockRestore(); }
  });
});
