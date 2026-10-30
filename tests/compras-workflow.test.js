import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  move: vi.fn(),
}));
vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../lib/inventario", () => ({ aplicarMovimiento: mocks.move }));
import {
  parseOrdenCompra,
  recibirEnOC,
  siguienteNumeroOC,
  convertirCotizacionCompra,
  purchaseDueDate,
} from "../lib/compras";
import {
  purchaseTotals,
  warehouseStatus,
  paymentTerms,
  samePurchaseFigures,
  businessPurchaseDate,
  purchaseDate,
} from "../lib/compras-form";
import { moneyWords } from "../lib/money-words";
const line = {
  nombre: "Equipo",
  productoId: "p",
  cantidad: 2,
  costoUnitario: 5652.17,
  impuestoPorcentaje: 15,
};
const doc = { proveedorId: "s", tipo: "compra", items: [line] };
describe("compras y cotizaciones al proveedor", () => {
  it("reproduce el cálculo de importes de la referencia sin usar datos personales/fiscales de ella", () => {
    expect(purchaseTotals([line])).toEqual({
      subtotal: 11304.34,
      impuesto: 1695.65,
      total: 12999.99,
    });
    expect(moneyWords(12999.99)).toBe(
      "DOCE MIL NOVECIENTOS NOVENTA Y NUEVE CON 99/100",
    );
  });
  it.each([null, undefined, [], [line, ...Array(100).fill(line)]])(
    "requiere entre 1 y 100 líneas: %j",
    (items) => {
      expect(parseOrdenCompra({ ...doc, items }).errors.length).toBeGreaterThan(
        0,
      );
    },
  );
  it.each(["", null, true, [], {}, 0, -1, 0.5, 1000000000])(
    "rechaza cantidad no válida: %j",
    (cantidad) => {
      expect(
        parseOrdenCompra({ ...doc, items: [{ ...line, cantidad }] }).errors
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it.each(["", null, false, [], {}, -1, 0.001, Infinity, 10000000000])(
    "no confunde costo vacío con cero y valida precisión: %j",
    (costoUnitario) => {
      expect(
        parseOrdenCompra({ ...doc, items: [{ ...line, costoUnitario }] }).errors
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it.each([0, 15, 18])(
    "ISV %s permitido, cálculo por línea",
    (impuestoPorcentaje) => {
      expect(
        parseOrdenCompra({ ...doc, items: [{ ...line, impuestoPorcentaje }] })
          .errors,
      ).toEqual([]);
    },
  );
  it("rechaza ISV arbitrario, moneda mezclada y un total fuera de rango", () => {
    expect(
      parseOrdenCompra({ ...doc, items: [{ ...line, impuestoPorcentaje: 16 }] })
        .errors.length,
    ).toBeGreaterThan(0);
    expect(parseOrdenCompra({ ...doc, moneda: "USD" }).errors[0]).toContain(
      "moneda nacional",
    );
    expect(
      parseOrdenCompra({
        ...doc,
        items: [{ ...line, costoUnitario: 9999999999.99 }],
      }).errors[0],
    ).toContain("importe máximo");
  });
  it("no permite fingir una recepción, cancelación o conversión al crear", () => {
    for (const estado of ["parcial", "recibida", "convertida"])
      expect(parseOrdenCompra({ ...doc, estado }).errors[0]).toContain(
        "recepción o conversión",
      );
  });
  it("los términos son condiciones, no pagos; valida el plazo y calcula vencimiento calendario", () => {
    expect(
      parseOrdenCompra({ ...doc, terminos: "credito", diasCredito: 0 })
        .errors[0],
    ).toContain("días de crédito");
    expect(
      parseOrdenCompra({ ...doc, terminos: "contado", diasCredito: 30 }).data
        .diasCredito,
    ).toBe(0);
    expect(
      purchaseDueDate(
        new Date("2026-10-31T00:00:00Z"),
        "credito",
        30,
      ).toISOString(),
    ).toBe("2026-11-30T00:00:00.000Z");
    expect(purchaseDueDate(new Date(), "contado", 0)).toBe(null);
    expect(paymentTerms({ terminos: "credito", diasCredito: 30 })).toBe(
      "Crédito 30 días",
    );
  });
  it("fechas imposibles no se normalizan silenciosamente", () => {
    expect(
      parseOrdenCompra({ ...doc, fecha: "2026-02-30" }).errors[0],
    ).toContain("Fecha");
    expect(
      parseOrdenCompra({ ...doc, fechaEsperada: "mal" }).errors[0],
    ).toContain("Fecha");
    expect(
      parseOrdenCompra({ notas: "Seguimiento" }, { partial: true }),
    ).toEqual({ data: { notas: "Seguimiento" }, errors: [] });
  });
  it("reordenar mantiene los importes pero cambiar el impuesto es un cambio financiero", () => {
    const b = {
      ...line,
      productoId: null,
      cantidad: 1,
      costoUnitario: 25,
      impuestoPorcentaje: 0,
    };
    expect(samePurchaseFigures([line, b], [b, line])).toBe(true);
    expect(
      samePurchaseFigures([line], [{ ...line, impuestoPorcentaje: 0 }]),
    ).toBe(false);
  });
  it("las fechas de negocio no cambian al pasar de UTC a Honduras", () => {
    expect(businessPurchaseDate(new Date("2026-10-31T02:00:00Z"))).toBe(
      "2026-10-30",
    );
    expect(
      parseOrdenCompra({
        ...doc,
        fecha: "2026-10-30",
      }).data.fecha.toISOString(),
    ).toBe("2026-10-30T12:00:00.000Z");
    expect(purchaseDate(new Date("2026-10-30T00:00:00Z"))).toBe("2026-10-30");
  });
  it("estado de almacén se obtiene de cantidades recibidas, no de una etiqueta manipulable", () => {
    expect(warehouseStatus({ tipo: "cotizacion" })).toBe("No aplica");
    expect(
      warehouseStatus({ items: [{ cantidad: 2, cantidadRecibida: 1 }] }),
    ).toContain("parcialmente");
    expect(
      warehouseStatus({ items: [{ cantidad: 2, cantidadRecibida: 2 }] }),
    ).toBe("Recibida");
    expect(
      warehouseStatus({
        estado: "cancelada",
        items: [{ cantidad: 2, cantidadRecibida: 1 }],
      }),
    ).toContain("conservada");
  });
  it.each([
    [0, "CERO CON 00/100"],
    [1, "UNO CON 00/100"],
    [100, "CIEN CON 00/100"],
    [1000, "MIL CON 00/100"],
    [21000, "VEINTIÚN MIL CON 00/100"],
    [1000000, "UN MILLÓN CON 00/100"],
    [21000000, "VEINTIÚN MILLONES CON 00/100"],
    [-1, ""],
    [Infinity, ""],
  ])("monto en letras %s", (value, expected) =>
    expect(moneyWords(value)).toBe(expected),
  );
});
let tx, order, receipt;
beforeEach(() => {
  vi.clearAllMocks();
  order = {
    id: "oc",
    numero: "OC-2026-000001",
    tipo: "compra",
    estado: "enviada",
    proveedorId: "s",
    items: [
      {
        id: "i",
        productoId: "p",
        nombre: "Equipo",
        cantidad: 5,
        cantidadRecibida: 0,
        costoUnitario: 20,
        impuestoPorcentaje: 15,
      },
    ],
  };
  receipt = null;
  tx = {
    $executeRaw: vi.fn(),
    ordenCompra: {
      findUnique: vi.fn(async () => order),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }) => ({ id: "new", ...data })),
      update: vi.fn(async ({ data }) => {
        Object.assign(order, data);
        return order;
      }),
    },
    proveedor: { findUnique: vi.fn(async () => ({ estado: "activo" })) },
    producto: { findMany: vi.fn(async () => [{ id: "p", nombre: "Equipo" }]) },
    bodega: { findUnique: vi.fn(async () => ({ estado: "activo" })) },
    recepcionCompra: {
      findUnique: vi.fn(async () => receipt),
      create: vi.fn(async ({ data }) => {
        receipt = data;
        return data;
      }),
    },
    ordenCompraItem: {
      update: vi.fn(async ({ where, data }) =>
        Object.assign(
          order.items.find((i) => i.id === where.id),
          data,
        ),
      ),
      findMany: vi.fn(async () => order.items),
    },
  };
  mocks.prisma.$transaction.mockImplementation((fn) => fn(tx));
});
const input = () => ({
  ocId: "oc",
  bodegaId: "b",
  requestId: "qa-receiving-00000001",
  items: [{ itemId: "i", cantidad: 2 }],
  actor: "qa@example.invalid",
});
describe("recepción transaccional e idempotente", () => {
  it("recepción parcial cambia cantidades y usa costo de compra, no precio de venta", async () => {
    const result = await recibirEnOC(input());
    expect(result.orden.estado).toBe("parcial");
    expect(mocks.move).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        costoUnitario: 20,
        cantidad: 2,
        productoId: "p",
        bodegaId: "b",
      }),
    );
    expect(receipt.detalle[0].cantidad).toBe(2);
  });
  it("repetir la misma operación tras perder la respuesta no duplica stock", async () => {
    await recibirEnOC(input());
    expect((await recibirEnOC(input())).replayed).toBe(true);
    expect(mocks.move).toHaveBeenCalledTimes(1);
    expect(order.items[0].cantidadRecibida).toBe(2);
  });
  it("replay incluso después de completar la compra no hace una segunda entrada", async () => {
    order.items[0].cantidad = 2;
    await recibirEnOC(input());
    expect(order.estado).toBe("recibida");
    expect((await recibirEnOC(input())).replayed).toBe(true);
    expect(mocks.move).toHaveBeenCalledTimes(1);
  });
  it("una clave no se puede reciclar con cantidades diferentes", async () => {
    await recibirEnOC(input());
    await expect(
      recibirEnOC({ ...input(), items: [{ itemId: "i", cantidad: 1 }] }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.move).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, "", "short", {}, "!".repeat(20)])(
    "exige identificador de operación válido: %j",
    async (requestId) => {
      await expect(
        recibirEnOC({ ...input(), requestId }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.move).not.toHaveBeenCalled();
    },
  );
  it.each(["borrador", "cancelada", "recibida"])(
    "no recibe una compra en estado %s",
    async (estado) => {
      order.estado = estado;
      await expect(recibirEnOC(input())).rejects.toMatchObject({ status: 409 });
      expect(mocks.move).not.toHaveBeenCalled();
    },
  );
  it("cotizaciones no reciben existencias", async () => {
    order.tipo = "cotizacion";
    await expect(recibirEnOC(input())).rejects.toMatchObject({ status: 404 });
    expect(mocks.move).not.toHaveBeenCalled();
  });
  it("rechaza sobre-recepción, duplicados y una línea ajena antes del primer movimiento", async () => {
    for (const items of [
      [{ itemId: "i", cantidad: 6 }],
      [
        { itemId: "i", cantidad: 1 },
        { itemId: "i", cantidad: 1 },
      ],
      [
        { itemId: "i", cantidad: 1 },
        { itemId: "otro", cantidad: 1 },
      ],
    ])
      await expect(recibirEnOC({ ...input(), items })).rejects.toHaveProperty(
        "status",
      );
    expect(mocks.move).not.toHaveBeenCalled();
  });
  it("no permite cambiar costos ni usar una bodega inactiva", async () => {
    await expect(
      recibirEnOC({
        ...input(),
        items: [{ itemId: "i", cantidad: 1, costoUnitario: 0.01 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    tx.bodega.findUnique.mockResolvedValue({ estado: "inactivo" });
    await expect(recibirEnOC(input())).rejects.toMatchObject({ status: 400 });
    expect(mocks.move).not.toHaveBeenCalled();
  });
  it("conceptos no inventariables se aceptan sin inventar movimientos de stock", async () => {
    order.items[0].productoId = null;
    await recibirEnOC(input());
    expect(mocks.move).not.toHaveBeenCalled();
    expect(order.items[0].cantidadRecibida).toBe(2);
  });
});
describe("cotización → compra y numeración", () => {
  it("la numeración no vuelve atrás al pasar de cuatro a cinco dígitos", async () => {
    const y = new Date().getUTCFullYear();
    tx.ordenCompra.findMany.mockResolvedValue([
      { numero: `OC-${y}-9999` },
      { numero: `OC-${y}-10000` },
    ]);
    expect(await siguienteNumeroOC(tx)).toBe(`OC-${y}-010001`);
  });
  it("convertir crea compra borrador y conserva la fuente sin crear stock ni pagos", async () => {
    order.tipo = "cotizacion";
    order.estado = "enviada";
    order.terminos = "credito";
    order.diasCredito = 30;
    const result = await convertirCotizacionCompra("oc", "actor");
    expect(result).toMatchObject({
      tipo: "compra",
      estado: "borrador",
      cotizacionOrigenId: "oc",
    });
    expect(order.estado).toBe("convertida");
    expect(mocks.move).not.toHaveBeenCalled();
    expect(tx.recepcionCompra.create).not.toHaveBeenCalled();
  });
  it("convertir por segunda vez devuelve la misma compra", async () => {
    order.tipo = "cotizacion";
    order.compraGenerada = { id: "ya", numero: "OC-1" };
    expect(await convertirCotizacionCompra("oc", "actor")).toEqual(
      order.compraGenerada,
    );
    expect(tx.ordenCompra.create).not.toHaveBeenCalled();
  });
});
