import { beforeEach, describe, expect, it, vi } from "vitest";

const m = {
  movimientos: [],
  total: 0,
  bodegas: [],
  findMany: vi.fn(),
  count: vi.fn(),
  bodegaFindMany: vi.fn(),
};

let permisos = ["inventario:read"];
vi.mock("@/lib/dal", () => ({ requirePermission: async () => ({ session: {}, permisos, response: null }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    movimientoKardex: { findMany: m.findMany, count: m.count },
    bodega: { findMany: m.bodegaFindMany },
  },
}));

const { GET } = await import("../app/api/inventario/kardex/route");

const pedir = (query = "") => GET(new Request(`http://local/api/inventario/kardex${query}`));

beforeEach(() => {
  permisos = ["inventario:read"];
  m.findMany.mockReset();
  m.count.mockReset();
  m.bodegaFindMany.mockReset();
  m.count.mockResolvedValue(0);
});

describe("Kardex: la transferencia muestra a qué bodega llegó", () => {
  it("resuelve el nombre del destino a partir de bodegaDestinoId", async () => {
    m.findMany.mockResolvedValue([
      {
        id: "k1",
        fecha: new Date("2026-10-31T10:00:00Z"),
        tipo: "transferencia",
        producto: { id: "p1", nombre: "Cable QA", sku: "QA-1", unidad: "Unidad", costo: 5 },
        bodega: { id: "b-sps", nombre: "Bodega principal", codigo: "SPS" },
        bodegaDestinoId: "b-ceiba",
        cantidad: 3,
        saldoAnterior: 10,
        saldoDespues: 7,
        costoUnitario: 5,
        referencia: "TR-1",
        motivo: "Traslado",
        actor: "bodega@arconet.local",
      },
    ]);
    m.total = 1;
    m.count.mockResolvedValue(1);
    m.bodegaFindMany.mockResolvedValue([{ id: "b-ceiba", nombre: "Bodega Ceiba", codigo: "CEI" }]);

    const res = await pedir("?tipo=transferencia");
    const json = await res.json();
    const [mov] = json.movimientos;

    expect(mov.bodega.nombre).toBe("Bodega principal");
    expect(mov.bodegaDestino).toEqual({ id: "b-ceiba", nombre: "Bodega Ceiba", codigo: "CEI" });
    expect(mov.bodegaDestinoId).toBe("b-ceiba");
    // Una sola consulta extra, sin N+1.
    expect(m.bodegaFindMany).toHaveBeenCalledTimes(1);
  });

  it("no consulta bodegas cuando ningún movimiento es transferencia", async () => {
    m.findMany.mockResolvedValue([
      {
        id: "k2",
        fecha: new Date("2026-10-31T10:00:00Z"),
        tipo: "entrada",
        producto: { id: "p1", nombre: "Cable QA", sku: "QA-1" },
        bodega: { id: "b-sps", nombre: "Bodega principal" },
        bodegaDestinoId: null,
        cantidad: 5,
        saldoAnterior: 0,
        saldoDespues: 5,
      },
    ]);
    m.count.mockResolvedValue(1);

    const json = await (await pedir()).json();
    expect(json.movimientos[0].bodegaDestino).toBeNull();
    expect(m.bodegaFindMany).not.toHaveBeenCalled();
  });

  it("respeta las fechas y la paginación enviadas por la pantalla", async () => {
    m.findMany.mockResolvedValue([]);
    await pedir("?desde=2026-10-01&hasta=2026-10-31&take=100&skip=100");

    const args = m.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.skip).toBe(100);
    expect(args.where.fecha.gte).toEqual(new Date("2026-10-01"));
    expect(args.where.fecha.lte).toEqual(new Date("2026-10-31"));
  });

  it("no deja pedir más de 500 filas de golpe", async () => {
    m.findMany.mockResolvedValue([]);
    await pedir("?take=9999");
    expect(m.findMany.mock.calls[0][0].take).toBe(500);
  });

  it("oculta el costo unitario a quien sólo puede ver inventario", async () => {
    m.findMany.mockResolvedValue([
      {
        id: "k3", fecha: new Date("2026-10-31T10:00:00Z"), tipo: "entrada",
        producto: { id: "p1", nombre: "Cable QA", sku: "QA-1" },
        bodega: { id: "b-sps", nombre: "Bodega principal" },
        bodegaDestinoId: null, cantidad: 5, saldoAnterior: 0, saldoDespues: 5,
        costoUnitario: 42.5, actor: "bodega@arconet.local", motivo: "Compra",
      },
    ]);
    m.count.mockResolvedValue(1);

    const json = await (await pedir()).json();
    expect(json.movimientos[0].costoUnitario).toBeNull();
    // El actor sí es visible: sirve para auditar quién registró el movimiento.
    expect(json.movimientos[0].actor).toBe("bodega@arconet.local");
  });

  it("entrega el costo a quien tiene permiso de compras o escritura de productos", async () => {
    permisos = ["inventario:read", "compras:read"];
    m.findMany.mockResolvedValue([
      {
        id: "k4", fecha: new Date("2026-10-31T10:00:00Z"), tipo: "entrada",
        producto: { id: "p1", nombre: "Cable QA", sku: "QA-1" },
        bodega: { id: "b-sps", nombre: "Bodega principal" },
        bodegaDestinoId: null, cantidad: 5, saldoAnterior: 0, saldoDespues: 5,
        costoUnitario: 42.5, actor: "admin@arconet.local",
      },
    ]);
    m.count.mockResolvedValue(1);

    const json = await (await pedir()).json();
    expect(Number(json.movimientos[0].costoUnitario)).toBe(42.5);
  });
});
