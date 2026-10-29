import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    producto: { findMany: vi.fn(), findFirst: vi.fn() },
    log: { findMany: vi.fn() },
  },
  permission: vi.fn(),
  session: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/dal", () => ({
  requirePermission: mocks.permission,
  requireSession: mocks.session,
}));
vi.mock("@/lib/precios-service", async (original) => ({
  ...(await original()),
  updateProductPrices: mocks.update,
}));
vi.mock("@/lib/logs", () => ({ writeLog: vi.fn() }));
import { GET as publicCatalog } from "../app/api/catalogo/route";
import { GET as list } from "../app/api/precios/route";
import { GET, PATCH } from "../app/api/precios/[id]/route";
import { PATCH as productPatch } from "../app/api/productos/[id]/route";
import { POST as productCreate } from "../app/api/productos/route";
const context = { params: Promise.resolve({ id: "p" }) };
const req = (body = {}) =>
  new Request("https://arconet.test/api/precios/p?q=cable", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const product = {
  id: "p",
  nombre: "Cable",
  precio: 100,
  precioDescuento: 90,
  precioMayorista: 80,
  costo: 5,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue({
    session: { correo: "admin@local" },
    permisos: ["precios:read", "precios:write", "productos:write"],
  });
  mocks.prisma.$transaction.mockImplementation((callback) => callback({}));
  mocks.prisma.producto.findMany.mockResolvedValue([product]);
  mocks.prisma.producto.findFirst.mockResolvedValue(product);
  mocks.prisma.log.findMany.mockResolvedValue([]);
  mocks.update.mockResolvedValue(product);
});
describe("autorización de precios y rutas alternas", () => {
  it.each([list, GET, PATCH])(
    "rechaza antes de consultar/escribir sin el permiso específico",
    async (handler) => {
      mocks.permission.mockResolvedValue({
        response: new Response(null, { status: 403 }),
      });
      expect((await handler(req({ precio: 90 }), context)).status).toBe(403);
      expect(mocks.prisma.producto.findMany).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );
  it("lector de precios obtiene búsqueda e historial privados sin costos internos", async () => {
    const result = await list(req());
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await result.json())[0]).not.toHaveProperty("costo");
    expect(mocks.permission).toHaveBeenCalledWith("precios:read");
    expect(
      mocks.prisma.producto.findMany.mock.calls[0][0].where.OR[0],
    ).toMatchObject({ nombre: { contains: "cable" } });
    expect((await GET(req(), context)).status).toBe(200);
  });
  it("permite al gestor modificar tarifas sin otorgarle escritura de productos", async () => {
    mocks.permission.mockResolvedValue({
      session: { correo: "gestor@local" },
      permisos: ["precios:write"],
    });
    expect(
      (await PATCH(req({ precioMayorista: 75, version: null }), context))
        .status,
    ).toBe(200);
    expect(mocks.permission).toHaveBeenCalledWith("precios:write");
    expect(mocks.update).toHaveBeenCalledWith(
      {},
      "p",
      { precioMayorista: 75 },
      { actor: "gestor@local", version: null },
    );
  });
  it.each([
    { stock: 999 },
    { costo: 5 },
    { precio: -1 },
    { precio: true },
    { precio: 20, nombre: "Intruso" },
    {},
    null,
    [],
  ])("rechaza campos ajenos o entradas inválidas: %s", async (body) => {
    expect((await PATCH(req(body), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("propaga conflicto de versión sin ocultarlo como error interno", async () => {
    mocks.update.mockRejectedValue(
      Object.assign(new Error("Actualiza la ficha"), { status: 409 }),
    );
    expect((await PATCH(req({ precio: 120 }), context)).status).toBe(409);
  });
  it("productos:write solo no permite cambiar tarifas por la ruta de productos ni crear con precio", async () => {
    mocks.permission.mockResolvedValue({
      session: { correo: "bodega@local" },
      permisos: ["productos:write"],
    });
    expect(
      (await productPatch(req({ precioDescuento: 1 }), context)).status,
    ).toBe(403);
    expect((await productCreate(req({ precio: 10 }))).status).toBe(403);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});

it('el catálogo público sigue exponiendo solo precio normal, no tarifas internas ni actores', async () => {
  const response = await publicCatalog(); expect(response.status).toBe(200);
  const [item] = await response.json(); expect(item.precio).toBe(100);
  for (const field of ['precioDescuento', 'precioMayorista', 'costo', 'preciosUpdatedAt', 'preciosUpdatedBy']) expect(item).not.toHaveProperty(field);
});
