import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { producto: { findFirst: mocks.find } } }));
import { GET } from "../app/api/foto-catalogo/[id]/route";
import { productosDeTienda } from "../app/catalogo/vitrina-paginacion";

const req = new Request("https://arconet.test/api/foto-catalogo/1");
const context = { params: Promise.resolve({ id: "1" }) };
beforeEach(() => vi.resetAllMocks());

describe("foto pública para la vitrina", () => {
  it("sirve solo la imagen de un producto activo, no archivado y con existencia", async () => {
    mocks.find.mockResolvedValue({ foto: "data:image/png;base64,aGVsbG8=" });
    const res = await GET(req, context);
    expect(mocks.find).toHaveBeenCalledWith({ where: { id: "1", estado: "activo", archivado: false, stock: { gt: 0 } }, select: { foto: true } });
    expect(res.status).toBe(200); expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("no-store"); expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toBe("hello");
  });
  it("no expone productos no disponibles y distingue un error de base", async () => {
    mocks.find.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("base fuera de línea"));
    expect((await GET(req, context)).status).toBe(404);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req, context); expect(res.status).toBe(503); expect(res.headers.get("cache-control")).toBe("no-store");
    spy.mockRestore();
  });
  it("convierte la ruta protegida del inventario a la foto pública sin cambiar rutas normales", () => {
    const base = { id: "a/b", nombre: "Equipo", stock: 1, categoria: "Componentes pasivos" };
    expect(productosDeTienda([{ ...base, foto: "/api/productos/a%2Fb/foto" }])[0].image).toBe("/api/foto-catalogo/a%2Fb");
    expect(productosDeTienda([{ ...base, foto: "/media/productos/foto.jpg" }])[0].image).toBe("/media/productos/foto.jpg");
  });
});
