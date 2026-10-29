import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
// Solo se prueban helpers fiscales puros y transacciones inyectadas. No crear
// Prisma ni exigir un cliente generado en el checkout limpio de CI.
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { parsePrices, priceAt, validatePriceSet } from "../lib/precios";
import {
  resolveCatalogPrices,
  updateProductPrices,
} from "../lib/precios-service";
import { parseProducto } from "../lib/productos";
import { calcularTotales, huellaDocumento } from "../lib/facturacion";
import { toOrden, toPrecio } from "../lib/serialize";
import { documento } from "./fixtures/print-documents";
const product = {
  id: "sku-1",
  nombre: "Cable",
  sku: "C-1",
  precio: 100,
  precioDescuento: 90,
  precioMayorista: 80,
  archivado: false,
  estado: "activo",
  preciosUpdatedAt: null,
};
const line = {
  productoId: "sku-1",
  nombre: "Precio falso",
  cantidad: 2,
  precio: 0.01,
  precioBase: 0.01,
};
const db = (p = product) => ({
  producto: { findMany: vi.fn().mockResolvedValue(p ? [p] : []) },
});
describe("tres valores de venta", () => {
  it("conserva precio como normal y dos tarifas opcionales, distintas del costo", () => {
    expect(
      parsePrices({
        precio: "120.50",
        precioDescuento: "",
        precioMayorista: null,
        costo: 5,
      }).data,
    ).toEqual({ precio: 120.5, precioDescuento: null, precioMayorista: null });
    expect(
      parseProducto(
        { precioDescuento: "85", precioMayorista: "80" },
        { partial: true },
      ).data,
    ).toEqual({ precioDescuento: 85, precioMayorista: 80 });
  });
  it.each([
    0,
    -1,
    true,
    false,
    [],
    {},
    " ",
    "hola",
    Infinity,
    1.005,
    10000000000,
  ])("rechaza normal inválido: %s", (value) => {
    expect(parsePrices({ precio: value }).errors.length).toBeGreaterThan(0);
  });
  it.each([0, -1, true, [], "a", 0.001])(
    "rechaza tarifas opcionales inválidas: %s",
    (value) => {
      expect(
        parsePrices({ precioDescuento: value }).errors.length,
      ).toBeGreaterThan(0);
    },
  );
  it("acepta centavos exactos y comprueba tarifas respecto al normal vigente", () => {
    expect(parsePrices({ precio: 1.01, precioDescuento: 0.01 }).errors).toEqual(
      [],
    );
    expect(validatePriceSet({ ...product, precio: 70 })).toHaveLength(2);
    expect(validatePriceSet({ ...product, precioMayorista: null })).toEqual([]);
    expect(priceAt(product, "mayorista")).toBe(80);
    expect(
      priceAt({ ...product, precioDescuento: null }, "descuento"),
    ).toBeNull();
  });
  it("no filtra costo, inventario o fotos por el DTO de precios", () => {
    const dto = toPrecio({ ...product, costo: 5, stock: 100, foto: "privado" });
    for (const key of ["costo", "stock", "foto"])
      expect(dto).not.toHaveProperty(key);
  });
});
describe("catálogo autoritativo y snapshots históricos", () => {
  it.each([
    ["normal", 100],
    ["descuento", 90],
    ["mayorista", 80],
  ])(
    "resuelve %s en servidor e ignora importes/nombre falsos",
    async (nivelPrecio, expected) => {
      const [item] = await resolveCatalogPrices(db(), [
        { ...line, nivelPrecio },
      ]);
      expect(item).toMatchObject({
        precio: expected,
        precioBase: 100,
        nombre: "Cable",
        nivelPrecio,
      });
    },
  );
  it("sin selección usa normal, nunca inventa un descuento", async () => {
    expect((await resolveCatalogPrices(db(), [line]))[0].precio).toBe(100);
    await expect(
      resolveCatalogPrices(db({ ...product, precioDescuento: null }), [
        { ...line, nivelPrecio: "descuento" },
      ]),
    ).rejects.toThrow("no está configurado");
  });
  it.each([
    null,
    { ...product, archivado: true },
    { ...product, estado: "inactivo" },
  ])("rechaza SKU inexistente, archivado o inactivo", async (p) => {
    await expect(resolveCatalogPrices(db(p), [line])).rejects.toThrow(
      "no está disponible",
    );
  });
  it.each([[null], [{ productoId: false }], [{ productoId: [] }]])(
    "rechaza líneas fiscales malformadas sin provocar un 500",
    async (items) => {
      await expect(resolveCatalogPrices(db(), items)).rejects.toMatchObject({
        status: 400,
      });
    },
  );
  it("conserva la tarifa histórica identificada aunque cambien catálogo, cantidad e importe enviado", async () => {
    const previous = [
      {
        ...line,
        id: "line-1",
        precio: 70,
        precioBase: 95,
        nivelPrecio: "descuento",
      },
    ];
    const [item] = await resolveCatalogPrices(
      db(),
      [
        {
          ...line,
          itemOriginalId: "line-1",
          nivelPrecio: "descuento",
          cantidad: 3,
        },
      ],
      { previous },
    );
    expect(item).toMatchObject({
      precio: 70,
      precioBase: 95,
      cantidad: 3,
      nivelPrecio: "descuento",
    });
    expect(item).not.toHaveProperty("itemOriginalId");
  });
  it("un formulario con líneas borradas por otra edición da conflicto, no recalcula su precio", async () => {
    await expect(
      resolveCatalogPrices(db(), [{ ...line, itemOriginalId: "viejo" }], {
        previous: [],
        editing: true,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("la actualización explícita y cambiar de nivel aplican el catálogo vigente", async () => {
    const previous = [
      { ...line, id: "line-1", precio: 70, nivelPrecio: "descuento" },
    ];
    for (const data of [
      { nivelPrecio: "descuento", actualizarPrecio: true },
      { nivelPrecio: "mayorista" },
    ]) {
      const [item] = await resolveCatalogPrices(
        db(),
        [{ ...line, itemOriginalId: "line-1", ...data }],
        { previous },
      );
      expect(item.precio).toBe(data.actualizarPrecio ? 90 : 80);
    }
  });
  it("ids de otra orden o snapshots enviados al crear no fijan un precio arbitrario", async () => {
    const [item] = await resolveCatalogPrices(db(), [
      { ...line, itemOriginalId: "otra-orden", nivelPrecio: "mayorista" },
    ]);
    expect(item.precio).toBe(80);
  });
  it("mantiene documentos antiguos sin tarifa y formularios antiguos sin id", async () => {
    const previous = [{ ...line, id: "old", precio: 45, precioBase: null }];
    const [item] = await resolveCatalogPrices(db(), [{ ...line, precio: 45 }], {
      previous,
    });
    expect(item).toMatchObject({
      precio: 45,
      nivelPrecio: null,
      precioBase: null,
    });
    expect(toOrden({ id: "o", items: previous }).items[0].id).toBe("old");
  });
  it("mantiene un snapshot incluso si el SKU se archivó después", async () => {
    const previous = [
      { ...line, id: "old", precio: 45, nivelPrecio: "normal" },
    ];
    expect(
      (
        await resolveCatalogPrices(
          db(null),
          [{ ...line, itemOriginalId: "old" }],
          { previous },
        )
      )[0].precio,
    ).toBe(45);
  });
  it("los conceptos libres no pueden falsificar metadatos de tarifa", async () => {
    const [item] = await resolveCatalogPrices(db(), [
      {
        nombre: "Servicio",
        cantidad: 1,
        precio: 10,
        nivelPrecio: "mayorista",
        precioBase: 200,
      },
    ]);
    expect(item).toMatchObject({
      precio: 10,
      nivelPrecio: null,
      precioBase: null,
    });
  });
  it("facturación preserva la tarifa y no permite descuentos adicionales sin autorización", async () => {
    const input = [
      { ...line, descripcion: "Cable", nivelPrecio: "descuento", descuento: 1 },
    ];
    await expect(
      resolveCatalogPrices(db(), input, { fiscal: true }),
    ).rejects.toMatchObject({ status: 403 });
    const resolved = await resolveCatalogPrices(db(), input, {
      fiscal: true,
      canDiscount: true,
    });
    expect(calcularTotales(resolved).items[0]).toMatchObject({
      precio: 90,
      precioBase: 100,
      nivelPrecio: "descuento",
    });
  });
  it("la huella antigua no cambia con columnas nulas; las tarifas nuevas quedan firmadas", () => {
    const old = huellaDocumento(documento, documento.items);
    expect(
      huellaDocumento(
        documento,
        documento.items.map((item) => ({
          ...item,
          nivelPrecio: null,
          precioBase: null,
        })),
      ),
    ).toBe(old);
    expect(
      huellaDocumento(
        documento,
        documento.items.map((item) => ({
          ...item,
          nivelPrecio: "normal",
          precioBase: 100,
        })),
      ),
    ).not.toBe(old);
  });
});
describe("edición de tarifas transaccional", () => {
  function tx(before = product) {
    return {
      $executeRaw: vi.fn(),
      producto: {
        findUnique: vi.fn().mockResolvedValue(before),
        update: vi
          .fn()
          .mockImplementation(async ({ data }) => ({ ...before, ...data })),
      },
      log: { create: vi.fn() },
    };
  }
  it("bloquea, valida el conjunto y registra antes/después con actor dentro de la transacción", async () => {
    const db = tx();
    await updateProductPrices(
      db,
      product.id,
      { precioDescuento: 85 },
      { actor: "admin@local", version: null },
    );
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.producto.findUnique.mock.invocationCallOrder[0],
    );
    const log = db.log.create.mock.calls[0][0].data;
    expect(log).toMatchObject({
      actor: "admin@local",
      ruta: "/api/precios/sku-1",
    });
    expect(JSON.parse(log.detalle)).toMatchObject({
      antes: { precioDescuento: 90 },
      despues: { precioDescuento: 85 },
    });
  });
  it("no permite bajar normal por debajo de tarifas ya configuradas en PATCH parcial", async () => {
    const db = tx();
    await expect(
      updateProductPrices(db, product.id, { precio: 50 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.producto.update).not.toHaveBeenCalled();
    expect(db.log.create).not.toHaveBeenCalled();
  });
  it("detecta una edición concurrente con 409 y sin escribir", async () => {
    const db = tx({ ...product, preciosUpdatedAt: new Date() });
    await expect(
      updateProductPrices(db, product.id, { precio: 120 }, { version: null }),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.producto.update).not.toHaveBeenCalled();
  });
  it("avanza la versión incluso cuando el reloj no supera la última modificación", async () => {
    const previous = new Date(Date.now() + 1000);
    const db = tx({ ...product, preciosUpdatedAt: previous });
    const saved = await updateProductPrices(db, product.id, { precioDescuento: 85 });
    expect(saved.preciosUpdatedAt.getTime()).toBeGreaterThan(previous.getTime());
  });
  it("no fabrica historial ni una versión nueva por un guardado sin cambios", async () => {
    const db = tx();
    await updateProductPrices(db, product.id, { precio: 100 });
    expect(db.producto.update.mock.calls[0][0].data).not.toHaveProperty(
      "preciosUpdatedAt",
    );
    expect(db.log.create).not.toHaveBeenCalled();
  });
});

describe("publicación con esquema actualizado", () => {
  it("el deploy aborta y recupera la app anterior si falla la migración requerida", () => {
    const deploy = readFileSync(
      new URL("../deploy.ps1", import.meta.url),
      "utf8",
    );
    const migrationStep = deploy.slice(
      deploy.indexOf("Applying database migrations..."),
      deploy.indexOf("# 6. Build"),
    );
    expect(migrationStep).toContain('Fail "prisma migrate deploy failed');
    expect(migrationStep).not.toContain("(se continua)");
  });
});
