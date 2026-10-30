import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { calcularTotales, emitirDocumentoFiscal } from "../lib/facturacion";
import { parseOrden } from "../lib/ordenes";
import { commercialTotal, checkedCommercialTotal, MAX_DOCUMENT_AMOUNT, sameCommercialAmounts, sameCatalogQuantities, fiscalPreviewTotals, validCommercialLine, lookupTerms, clientIdentity } from "../lib/ventas-form";

const concept = { kind: "concepto", nombre: "Visita técnica", cantidad: "1", precio: "100.50" };

describe("documentos construidos desde líneas", () => {
  it.each([{}, { monto: 100 }, { monto: 100, items: [] }])("no crea una orden comercial a partir de un monto aislado: %j", fields => {
    expect(parseOrden({ clienteId: "c", ...fields }).errors[0]).toContain("al menos un producto o concepto");
  });
  it("permite conceptos con cantidades fraccionarias y total calculado", () => {
    const parsed = parseOrden({ clienteId: "c", monto: 99999, items: [{ ...concept, cantidad: "0.5" }] });
    expect(parsed.errors).toEqual([]);
    expect(parsed.data.monto).toBe(50.25);
    expect(parsed.data.items[0]).toMatchObject({ productoId: null, cantidad: 0.5, precio: 100.5 });
  });
  it("editar sólo cabecera no obliga a reescribir históricos sin líneas", () => {
    expect(parseOrden({ notas: "Seguimiento" }, { partial: true })).toEqual({ data: { notas: "Seguimiento" }, errors: [] });
    expect(parseOrden({ items: [] }, { partial: true }).errors).toEqual([]);
  });
  it("un precio cero explícito no se confunde con un precio vacío", () => {
    expect(validCommercialLine({ ...concept, precio: "0" })).toBe(true);
    expect(validCommercialLine({ ...concept, precio: "" })).toBe(false);
    expect(parseOrden({ clienteId: "c", items: [{ ...concept, precio: 0 }] }).errors).toEqual([]);
  });
  it("redondea por línea y suma exactamente lo que se presenta", () => {
    const items = [{ ...concept, cantidad: 0.003, precio: 5 }, { ...concept, cantidad: 0.003, precio: 5 }];
    expect(commercialTotal(items)).toBe(0.04);
    expect(parseOrden({ clienteId: "c", items }).data.monto).toBe(0.04);
    expect(commercialTotal([{ cantidad: 3, precio: 0.1 }, { cantidad: 1, precio: 0.2 }])).toBe(0.5);
  });
  it("un producto debe seleccionarse, no basta con escribir su nombre", () => {
    expect(validCommercialLine({ ...concept, kind: "producto", productoId: "" })).toBe(false);
    expect(validCommercialLine({ ...concept, kind: "producto", productoId: "p" })).toBe(true);
  });
  it("sólo los conceptos admiten cantidades fraccionarias", () => {
    expect(validCommercialLine({ ...concept, cantidad: 0.25 })).toBe(true);
    expect(validCommercialLine({ ...concept, productoId: "p", cantidad: 0.25 })).toBe(false);
    expect(parseOrden({ clienteId: "c", items: [{ ...concept, productoId: "p", cantidad: 0.25 }] }).errors[0]).toContain("entera");
  });
  it.each(["", " ", null, true, [], {}, "abc", -1, Infinity, 0.0001, 1.00000001, 1000000000])("rechaza cantidades vacías, no numéricas o fuera de precisión: %j", cantidad => {
    expect(validCommercialLine({ ...concept, cantidad })).toBe(false);
    expect(parseOrden({ clienteId: "c", items: [{ ...concept, cantidad }] }).errors.length).toBeGreaterThan(0);
  });
  it.each(["", " ", null, false, [], {}, "abc", -1, Infinity, 0.001, 10000000000])("rechaza precios vacíos, no numéricos o fuera de precisión: %j", precio => {
    expect(validCommercialLine({ ...concept, precio })).toBe(false);
    expect(parseOrden({ clienteId: "c", items: [{ ...concept, precio }] }).errors.length).toBeGreaterThan(0);
  });
  it("no deja pasar totales mayores que el Decimal fiscal/comercial", () => {
    const items = [{ ...concept, cantidad: 2, precio: MAX_DOCUMENT_AMOUNT }];
    expect(() => checkedCommercialTotal(items)).toThrow(/importe máximo/);
    expect(parseOrden({ clienteId: "c", items }).errors[0]).toContain("importe máximo");
    expect(calcularTotales([{ descripcion: "Servicio", cantidad: 1, precio: MAX_DOCUMENT_AMOUNT, impuestoPorcentaje: 15 }]).errors[0]).toContain("importe máximo");
  });
  it("limita el detalle a 100 líneas", () => {
    expect(parseOrden({ clienteId: "c", items: Array.from({ length: 101 }, () => concept) }).errors[0]).toContain("máximo 100");
  });
});

describe("totales fiscales coinciden con la emisión autoritativa", () => {
  it.each([undefined, [], Array.from({ length: 101 }, () => ({}))])("no emite facturas sin detalle ni con más de 100 líneas", async items => {
    await expect(emitirDocumentoFiscal({ tx: {}, items })).rejects.toMatchObject({ status: 400 });
  });
  it.each(["", " ", null, false, []])("un precio vacío no es un concepto de precio cero: %j", precio => {
    expect(calcularTotales([{ descripcion: "Servicio", cantidad: 1, precio }]).errors.length).toBeGreaterThan(0);
  });
  it.each([0, 15, 18])("ISV %s: base e impuesto redondeados por cada concepto", impuestoPorcentaje => {
    const items = Array.from({ length: 7 }, (_, i) => ({ descripcion: `Servicio ${i}`, cantidad: 0.003 * (i + 1), precio: 5.01, descuento: i === 6 ? 0.01 : 0, impuestoPorcentaje }));
    const calculated = calcularTotales(items);
    expect(calculated.errors).toEqual([]);
    expect(fiscalPreviewTotals(items)).toEqual({ subtotal: calculated.subtotal, descuento: calculated.descuento, impuesto: calculated.impuesto, total: calculated.total });
  });
  it("combina líneas gravadas, exentas y descuentos sin sumar ISV sin redondear", () => {
    const items = [
      { descripcion: "Equipo", cantidad: 2, precio: 90, descuento: 5, impuestoPorcentaje: 15 },
      { descripcion: "Instalación", cantidad: 0.5, precio: 20, descuento: 0, impuestoPorcentaje: 0 },
      { descripcion: "Otro servicio", cantidad: 0.003, precio: 5, descuento: 0, impuestoPorcentaje: 18 },
    ];
    const calculated = calcularTotales(items);
    expect(fiscalPreviewTotals(items)).toMatchObject({ subtotal: 185.02, impuesto: 26.25, descuento: 5, total: 211.27 });
    expect(fiscalPreviewTotals(items).total).toBe(calculated.total);
  });
});

describe("preservación de importes y snapshots", () => {
  const old = [{ id: "linea", productoId: "p", nombre: "Nombre anterior", cantidad: 2, precio: 70 }];
  it("editar nombre/notas/tarifa de igual importe no cambia el total histórico", () => {
    expect(sameCommercialAmounts(old, [{ ...old[0], nombre: "Otro", nivelPrecio: "descuento" }])).toBe(true);
    expect(sameCommercialAmounts([], [])).toBe(true);
  });
  it("reordenar conserva las mismas líneas financieras, sin colapsar duplicados ni fracciones", () => {
    const service = { nombre: "Concepto", cantidad: 0.003, precio: 5 };
    const before = [...old, service, { ...service }];
    expect(sameCommercialAmounts(before, [service, old[0], service])).toBe(true);
    expect(sameCommercialAmounts(before, [service, old[0], old[0]])).toBe(false);
    expect(sameCommercialAmounts(before, [old[0], { ...service, cantidad: 0.006 }])).toBe(false);
  });
  it.each([{ cantidad: 3 }, { precio: 80 }, { productoId: "otro" }])("un cambio financiero %j requiere recalcular", change => {
    expect(sameCommercialAmounts(old, [{ ...old[0], ...change }])).toBe(false);
    expect(sameCommercialAmounts(old, [])).toBe(false);
  });
});

it("el inventario compara productos/cantidades agregadas, no precios, orden ni conceptos", () => {
  const old = [{ productoId: "p", cantidad: 2, precio: 100 }, { productoId: "p", cantidad: 1, precio: 90 }];
  expect(sameCatalogQuantities(old, [{ nombre: "Servicio", cantidad: 3 }, { productoId: "p", cantidad: 3, precio: 80 }])).toBe(true);
  expect(sameCatalogQuantities(old, [{ productoId: "p", cantidad: 4 }])).toBe(false);
  expect(sameCatalogQuantities([], [{ nombre: "Servicio", cantidad: 1 }])).toBe(true);
});

describe("búsqueda e identidad del cliente", () => {
  it("normaliza tildes, mayúsculas y palabras; mantiene los números guardados", () => {
    expect(lookupTerms(" JOSÉ   García  0801-1990 ")).toEqual(["jose", "garcia", "0801-1990"]);
    expect(lookupTerms("ÓPTICA Ñúñez")).toEqual(["optica", "nunez"]);
  });
  it("acota términos y longitud del query", () => {
    expect(lookupTerms("a ".repeat(100))).toHaveLength(10);
    expect(lookupTerms("x".repeat(1000))[0]).toHaveLength(100);
  });
  it("distingue homónimos con la identificación real, sin fabricarla", () => {
    const first = { id: "a", nombre: "José García", rtn: "0801-0001", telefono: "9000-0001" };
    const second = { ...first, id: "b", rtn: "0801-0002" };
    expect(clientIdentity(first)).not.toBe(clientIdentity(second));
    expect(clientIdentity(first)).toContain("0801-0001");
    expect(clientIdentity({ id: "a", nombre: "Eventual" })).toBe("Sin identificación registrada · Ref. a");
    expect(clientIdentity({ id: "a", estado: "inactivo" })).toContain("Inactivo");
  });
});
