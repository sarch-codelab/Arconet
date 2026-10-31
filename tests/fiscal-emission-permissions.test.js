import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SALES_PERMISSIONS } from "../lib/roles-defaults";

const mocks = vi.hoisted(() => ({
  permissions: [],
  authenticated: true,
  transaction: vi.fn(),
  emit: vi.fn(),
  stock: vi.fn(),
  reverse: vi.fn(),
  logs: vi.fn(),
}));
vi.mock("../lib/dal", () => ({
  requirePermission: vi.fn(async permission => {
    if (!mocks.authenticated) return { response: Response.json({ error: "No autenticado." }, { status: 401 }) };
    if (!mocks.permissions.includes(permission)) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
    return { session: { correo: "ventas@qa.arconet.local" }, permisos: mocks.permissions, response: null };
  }),
}));
vi.mock("../lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("../lib/facturacion", () => ({
  TIPOS_DOCUMENTO: ["factura", "nota_credito", "nota_debito"],
  emitirDocumentoFiscal: mocks.emit,
  obtenerConfigFiscal: vi.fn(),
}));
vi.mock("../lib/stock-ventas", () => ({ descontarStock: mocks.stock, tieneSalidas: vi.fn(), revertirStock: mocks.reverse }));
vi.mock("../lib/logs", () => ({ writeLog: mocks.logs }));

import { POST } from "../app/api/facturacion/documentos/route";
import { PUT as configure } from "../app/api/facturacion/config/route";
import { PATCH as annul } from "../app/api/facturacion/documentos/[id]/route";
const request = (body = {}, method = "POST") => new Request("https://arconet.test/api/facturacion/documentos", {
  method, headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clienteId: "qa-client", items: [{ descripcion: "Servicio", cantidad: 1, precio: 100 }], ...body }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = [...DEFAULT_SALES_PERMISSIONS];
  mocks.authenticated = true;
  mocks.transaction.mockImplementation(callback => callback({}));
  mocks.emit.mockResolvedValue({ documento: { id: "qa-fiscal", total: 115, items: [] }, tieneRango: false });
});

describe("emisión fiscal operativa del rol Ventas", () => {
  it("el rol predeterminado emite directamente con un POST y descuenta stock una vez", async () => {
    expect((await POST(request())).status).toBe(201);
    expect(mocks.emit).toHaveBeenCalledOnce();
    expect(mocks.emit).toHaveBeenCalledWith(expect.objectContaining({ tipo: "factura", ordenId: null, canDiscount: false }));
    expect(mocks.stock).toHaveBeenCalledOnce();
    expect(mocks.permissions).not.toContain("facturacion:write");
    expect(mocks.permissions).not.toContain("precios:write");
  });
  it.each([[], ["facturacion:read"], ["facturacion:emit"], ["facturacion:write"], ["ordenes:read", "ordenes:write"]].map(permissions => [permissions]))("no autoriza permisos incompletos ni infiere emisión de órdenes: %j", async permissions => {
    mocks.permissions = permissions;
    expect((await POST(request())).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("sin sesión responde 401 sin leer/escribir la operación", async () => {
    mocks.authenticated = false;
    expect((await POST(request())).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(["nota_credito", "nota_debito"])("Emitir ventas no permite %s", async tipo => {
    expect((await POST(request({ tipo }))).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("no habilita la conversión/vínculo de un histórico comercial", async () => {
    expect((await POST(request({ ordenId: "legacy-sale" }))).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("no permite modificar CAI ni anular facturas", async () => {
    expect((await configure(request({}, "PUT"))).status).toBe(403);
    expect((await annul(request({ motivo: "QA" }, "PATCH"), { params: Promise.resolve({ id: "qa-fiscal" }) })).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.reverse).not.toHaveBeenCalled();
  });
  it.each(["factura", "nota_credito", "nota_debito"])("conserva %s para el permiso histórico de gestión fiscal", async tipo => {
    mocks.permissions = ["facturacion:read", "facturacion:write"];
    expect((await POST(request({ tipo }))).status).toBe(201);
    expect(mocks.stock).toHaveBeenCalledTimes(tipo === "factura" ? 1 : 0);
  });
});
