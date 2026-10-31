import { describe, expect, it, vi } from "vitest";
import { getAdminSummary } from "../lib/admin-summary-service";
import { summaryScope } from "../lib/summary-policy";
import { DEFAULT_SALES_PERMISSIONS } from "../lib/roles-defaults";
import { ALL_PERMISSIONS } from "../lib/permisos";

const states = [{ estado: "activo", _count: { _all: 275 } }];
function database() {
  const tx = {};
  for (const name of ["trabajador", "sucursal", "cliente", "producto", "categoria", "rol", "orden", "pago", "documentoFiscal", "ordenCompra", "proveedor", "areaSolicitud", "solicitudInterna", "log"]) tx[name] = {
    groupBy: vi.fn().mockResolvedValue(states), count: vi.fn().mockResolvedValue(3),
    findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _count: { _all: 240, precioDescuento: 120, precioMayorista: 110 }, _sum: { monto: "10.00" } }),
  };
  tx.documentoFiscal.groupBy.mockResolvedValue([{ tipo: "factura", estado: "emitido", moneda: "HNL", _count: { _all: 150 }, _sum: { total: "1500.25" } }]);
  tx.orden.groupBy.mockResolvedValue([{ estado: "pendiente", _count: { _all: 135 } }]);
  tx.ordenCompra.groupBy.mockResolvedValue([]);
  tx.areaSolicitud.findMany.mockResolvedValue([{ slug: "area-propia" }]);
  tx.$executeRaw = vi.fn().mockResolvedValue(0);
  tx.$queryRaw = vi.fn().mockResolvedValue([{ count: 2, amount: "90.10" }]);
  const db = { $transaction: vi.fn(async callback => callback(tx)) };
  return { db, tx };
}
const session = { rol: "rol-personalizado", correo: "Persona@ARCONET.LOCAL" };

describe("consultas agregadas del Resumen", () => {
  it("Ventas agrega todas las filas, no las primeras 100, sin consultar personal/stock/compras", async () => {
    const { db, tx } = database();
    const result = await getAdminSummary(db, session, DEFAULT_SALES_PERMISSIONS);
    expect(result.groups.map(g => g.id)).toEqual(["ventas", "clientes", "catalogo"]);
    const cards = result.groups[0].cards;
    expect(cards.find(c => c.id === "sales-count").value).toBe(152);
    expect(cards.find(c => c.id === "sales-total-0").value).toBe("1590.35");
    expect(cards.find(c => c.id === "quotes").value).toBe(135);
    expect(result.groups[1].cards[0].value).toBe(275);
    for (const name of ["trabajador", "sucursal", "ordenCompra", "proveedor", "areaSolicitud", "solicitudInterna", "log"]) for (const method of Object.values(tx[name])) expect(method).not.toHaveBeenCalled();
    expect(tx.orden.findMany).not.toHaveBeenCalled(); expect(tx.documentoFiscal.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(tx.producto.aggregate.mock.calls)).not.toContain("costo");
    expect(result).not.toHaveProperty("recentWorkers"); expect(result).not.toHaveProperty("branches");
  });
  it("usa una instantánea repetible y de sólo lectura", async () => {
    const { db, tx } = database();
    await getAdminSummary(db, session, ["clientes:read"]);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "RepeatableRead" }));
    expect(tx.$executeRaw.mock.calls[0][0].join("")).toContain("READ ONLY");
  });
  it("la deduplicación fiscal sólo se consulta si ambas fuentes están autorizadas", async () => {
    const both = database(); await getAdminSummary(both.db, session, ["ordenes:read", "facturacion:read", "reportes:read"]);
    expect(both.tx.$queryRaw.mock.calls[0][0].join("")).toContain("NOT EXISTS");
    const commercial = database(); await getAdminSummary(commercial.db, session, ["ordenes:read", "reportes:read"]);
    expect(commercial.tx.$queryRaw.mock.calls[0][0].join("")).not.toContain("DocumentoFiscal");
    expect(commercial.tx.documentoFiscal.groupBy).not.toHaveBeenCalled();
    expect(commercial.tx.documentoFiscal.count).not.toHaveBeenCalled();
  });
  it("sin Reportes consulta cantidades, sin SELECT/SUM monetario ni pagos", async () => {
    const { db, tx } = database();
    const result = await getAdminSummary(db, session, ["ordenes:read", "facturacion:read", "compras:read"]);
    expect(tx.$queryRaw).not.toHaveBeenCalled(); expect(tx.pago.aggregate).not.toHaveBeenCalled();
    expect(tx.orden.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ documentos: { none: { tipo: "factura", estado: { not: "anulado" } } } }) }));
    expect(tx.documentoFiscal.groupBy.mock.calls[0][0]).not.toHaveProperty("_sum");
    expect(tx.ordenCompra.groupBy.mock.calls[0][0]).not.toHaveProperty("_sum");
    expect(result.groups.flatMap(g => g.cards).every(card => card.format === "count")).toBe(true);
  });
  it("Bodega sin compras/globales no recibe ventas, costos ni consultas financieras", async () => {
    const { db, tx } = database();
    const result = await getAdminSummary(db, session, ["inventario:read", "productos:read", "compras:receive"]);
    expect(result.inventory).toBe(true); expect(result.groups).toEqual([]);
    for (const name of ["orden", "pago", "documentoFiscal", "ordenCompra", "proveedor", "trabajador"]) for (const method of Object.values(tx[name])) expect(method).not.toHaveBeenCalled();
    expect(tx.producto.groupBy).not.toHaveBeenCalled(); // Inventario conserva su DTO propio sin duplicar tarjetas.
  });
  it("precios solos nunca consultan clientes, ventas o costos", async () => {
    const { db, tx } = database();
    const result = await getAdminSummary(db, session, ["precios:read"]);
    expect(result.groups.map(g => g.id)).toEqual(["catalogo"]);
    expect(tx.producto.aggregate.mock.calls[0][0]).toEqual({ where: { archivado: false, estado: "activo" }, _count: { _all: true, precioDescuento: true, precioMayorista: true } });
    expect(tx.cliente.groupBy).not.toHaveBeenCalled(); expect(tx.orden.groupBy).not.toHaveBeenCalled();
  });
  it("personal y sucursales sólo incluyen sus campos explícitos autorizados", async () => {
    const { db, tx } = database();
    tx.trabajador.findMany.mockResolvedValue([{ id: "w", nombre: "Persona", puesto: "QA", ingreso: new Date("2026-10-31T00:00:00Z"), correo: "NO-DEVOLVER", passwordHash: "NO-DEVOLVER" }]);
    tx.sucursal.findMany.mockResolvedValue([{ id: "s", nombre: "Sucursal", estado: "activo" }]);
    tx.trabajador.groupBy.mockImplementation(async query => query.by[0] === "sucursalId" ? [{ sucursalId: "s", _count: { _all: 275 } }] : states);
    const result = await getAdminSummary(db, session, ["trabajadores:read", "sucursales:read"]);
    expect(result.recentWorkers[0]).toEqual({ id: "w", nombre: "Persona", puesto: "QA", ingreso: "2026-10-31" });
    expect(result.branches[0].workers).toBe(275); expect(JSON.stringify(result)).not.toContain("NO-DEVOLVER");
    const branchOnly = database(); await getAdminSummary(branchOnly.db, session, ["sucursales:read"]);
    expect(branchOnly.tx.trabajador.groupBy).not.toHaveBeenCalled(); expect(branchOnly.tx.trabajador.findMany).not.toHaveBeenCalled();
  });
  it("las órdenes internas respetan autor/responsable/áreas, aunque haya Reportes", async () => {
    const { db, tx } = database();
    await getAdminSummary(db, session, ["solicitudes:read", "reportes:read"]);
    const where = tx.solicitudInterna.groupBy.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ solicitanteCorreo: { equals: "persona@arconet.local", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ responsableCorreo: { equals: "persona@arconet.local", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ area: { in: ["area-propia"] } });
    expect(tx.solicitudInterna.count.mock.calls[0][0].where.AND[0]).toEqual(where);
  });
  it("Reportes solo muestra accesos, no otorga consultas de otros módulos", async () => {
    const { db, tx } = database(); const result = await getAdminSummary(db, session, ["reportes:read"]);
    expect(result.groups).toEqual([]); expect(result.inventory).toBe(false);
    for (const name of Object.keys(tx).filter(k => !k.startsWith("$"))) for (const method of Object.values(tx[name])) expect(method).not.toHaveBeenCalled();
  });
  it("sin permisos no abre siquiera la transacción", async () => {
    const { db } = database(); await expect(getAdminSummary(db, session, [])).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("un fallo de base no se transforma en contadores cero", async () => {
    const { db, tx } = database(); tx.cliente.groupBy.mockRejectedValue(new Error("fallo controlado"));
    await expect(getAdminSummary(db, session, ["clientes:read"])).rejects.toThrow("fallo controlado");
  });
  it("las compras confirmadas no mezclan borradores, cotizaciones ni monedas", async () => {
    const { db, tx } = database();
    tx.ordenCompra.groupBy.mockResolvedValue([
      { tipo: "compra", estado: "enviada", moneda: "HNL", _count: { _all: 1 }, _sum: { total: "100.50" } },
      { tipo: "compra", estado: "recibida", moneda: "USD", _count: { _all: 1 }, _sum: { total: "20.25" } },
      ...["borrador", "cancelada"].map(estado => ({ tipo: "compra", estado, moneda: "HNL", _count: { _all: 1 }, _sum: { total: "99999" } })),
      { tipo: "cotizacion", estado: "enviada", moneda: "HNL", _count: { _all: 1 }, _sum: { total: "99999" } },
    ]);
    const result = await getAdminSummary(db, session, ["compras:read", "reportes:read"]);
    expect(result.groups[0].cards.filter(c => c.format === "money").map(c => [c.currency, c.value])).toEqual([["HNL", "100.50"], ["USD", "20.25"]]);
  });
  it("administrador mantiene grupos operativos sin valores financieros de inventario", async () => {
    const { db } = database(); const result = await getAdminSummary(db, session, ALL_PERMISSIONS);
    expect(result.inventory).toBe(true); expect(result.groups.map(g => g.id)).toContain("administracion");
    expect(JSON.stringify(result)).not.toMatch(/costoUnitario|passwordHash|sessionSecret|valorizado/);
    expect(summaryScope(ALL_PERMISSIONS).reports).toBe(true);
  });
});


describe("etiquetas y tarjetas ajustadas a las fuentes autorizadas", () => {
  it("fiscal solamente no duplica el contador ni promete cotizaciones/históricos", async () => {
    const { db } = database(); const result = await getAdminSummary(db, session, ["facturacion:read", "reportes:read"]);
    expect(result.groups[0].title).toBe("Facturación fiscal");
    expect(result.groups[0].cards.some(card => card.id === "sales-count")).toBe(false);
    expect(result.groups[0].cards.find(card => card.format === "money").detail).toContain("Sólo documentos fiscales");
  });
  it("comercial solamente no afirma que sus importes incluyan facturas", async () => {
    const { db } = database(); const result = await getAdminSummary(db, session, ["ordenes:read", "reportes:read"]);
    expect(result.groups[0].title).toBe("Documentos comerciales");
    expect(result.groups[0].cards.find(card => card.format === "money").detail).toContain("No incluye documentos fiscales");
  });
});


describe("descripción del alcance de órdenes internas", () => {
  it.each([["administrador", "Órdenes del sistema"], ["rol-personalizado", "Sólo las tuyas"]])("explica el alcance efectivo para %s sin alterar su política", async (rol, text) => {
    const { db } = database();
    const result = await getAdminSummary(db, { ...session, rol }, ["solicitudes:read"]);
    expect(result.groups[0].cards[0].detail).toContain(text);
  });
});
