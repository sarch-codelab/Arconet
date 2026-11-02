import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  tx: {
    $executeRaw: vi.fn(),
    cliente: { findUnique: vi.fn(), delete: vi.fn() },
    orden: { findMany: vi.fn(), deleteMany: vi.fn() },
    documentoFiscal: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
  requirePermission: vi.fn(),
  revertirStock: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/dal", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/stock-ventas", () => ({ revertirStock: mocks.revertirStock }));
vi.mock("@/lib/logs", () => ({ writeLog: mocks.writeLog }));

import { DELETE } from "../app/api/clientes/[id]/route";

const request = new Request("https://arconet.test/api/clientes/c-1", { method: "DELETE" });
const context = { params: Promise.resolve({ id: "c-1" }) };
// El rol especial funciona con el catálogo real, aunque este no exponga una
// acción general facturacion:delete en la pantalla de roles.
const adminPermissions = ["clientes:delete", "ordenes:delete", "facturacion:write"];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePermission.mockResolvedValue({
    session: { correo: "admin@arconet.local", rol: "administrador" },
    permisos: adminPermissions,
    response: null,
  });
  mocks.prisma.$transaction.mockImplementation(async callback => callback(mocks.tx));
  mocks.tx.cliente.findUnique.mockResolvedValue({ id: "c-1", nombre: "Cliente QA" });
  mocks.tx.orden.findMany.mockResolvedValue([]);
  mocks.tx.documentoFiscal.findMany.mockResolvedValue([]);
});

describe("eliminación de cliente y registros asociados", () => {
  it("administrador elimina órdenes y documentos en una sola transacción", async () => {
    mocks.tx.orden.findMany.mockResolvedValue([
      { id: "o-venta", tipo: "venta" },
      { id: "o-cotizacion", tipo: "cotizacion" },
    ]);
    mocks.tx.documentoFiscal.findMany.mockResolvedValue([
      { id: "f-1", tipo: "factura" },
      { id: "nc-1", tipo: "nota_credito" },
    ]);

    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, ordenesEliminadas: 2, documentosEliminados: 2 });
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.tx.$executeRaw).toHaveBeenCalledOnce();
    expect(mocks.revertirStock).toHaveBeenCalledTimes(2);
    expect(mocks.revertirStock.mock.calls.map(([, args]) => args.referencia)).toEqual(["venta:o-venta", "factura:f-1"]);
    expect(mocks.tx.documentoFiscal.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["f-1", "nc-1"] } } });
    expect(mocks.tx.orden.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["o-venta", "o-cotizacion"] } } });
    expect(mocks.tx.cliente.delete).toHaveBeenCalledWith({ where: { id: "c-1" } });
    expect(mocks.tx.documentoFiscal.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.tx.orden.deleteMany.mock.invocationCallOrder[0]);
    expect(mocks.tx.orden.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.tx.cliente.delete.mock.invocationCallOrder[0]);
    expect(mocks.writeLog).toHaveBeenCalledOnce();
  });

  it("un cliente sin relaciones solo necesita su propio permiso de eliminación", async () => {
    mocks.requirePermission.mockResolvedValue({ session: { correo: "qa" }, permisos: ["clientes:delete"], response: null });
    expect((await DELETE(request, context)).status).toBe(200);
    expect(mocks.revertirStock).not.toHaveBeenCalled();
    expect(mocks.tx.orden.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.documentoFiscal.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.cliente.delete).toHaveBeenCalledOnce();
  });

  it("no permite borrar órdenes indirectamente sin ordenes:delete", async () => {
    mocks.requirePermission.mockResolvedValue({ session: { correo: "qa" }, permisos: ["clientes:delete", "facturacion:delete"], response: null });
    mocks.tx.orden.findMany.mockResolvedValue([{ id: "o-1", tipo: "cotizacion" }]);
    const response = await DELETE(request, context);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Tu rol también necesita permiso para eliminar las órdenes asociadas." });
    expect(mocks.tx.cliente.delete).not.toHaveBeenCalled();
    expect(mocks.tx.orden.deleteMany).not.toHaveBeenCalled();
    expect(mocks.revertirStock).not.toHaveBeenCalled();
  });

  it("no permite borrar documentos fiscales indirectamente a un rol que no es administrador", async () => {
    mocks.requirePermission.mockResolvedValue({ session: { correo: "qa" }, permisos: ["clientes:delete", "ordenes:delete"], response: null });
    mocks.tx.documentoFiscal.findMany.mockResolvedValue([{ id: "f-1", tipo: "factura" }]);
    expect((await DELETE(request, context)).status).toBe(403);
    expect(mocks.tx.cliente.delete).not.toHaveBeenCalled();
    expect(mocks.tx.documentoFiscal.deleteMany).not.toHaveBeenCalled();
    expect(mocks.revertirStock).not.toHaveBeenCalled();
  });

  it("devuelve 404 y no consulta relaciones si el cliente no existe", async () => {
    mocks.tx.cliente.findUnique.mockResolvedValue(null);
    expect((await DELETE(request, context)).status).toBe(404);
    expect(mocks.tx.orden.findMany).not.toHaveBeenCalled();
    expect(mocks.tx.documentoFiscal.findMany).not.toHaveBeenCalled();
    expect(mocks.tx.cliente.delete).not.toHaveBeenCalled();
  });

  it("mantiene el guard de clientes:delete antes de abrir la transacción", async () => {
    mocks.requirePermission.mockResolvedValue({ session: null, permisos: [], response: Response.json({ error: "No autorizado." }, { status: 403 }) });
    expect((await DELETE(request, context)).status).toBe(403);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
