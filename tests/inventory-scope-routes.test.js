import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  permissions: [],
  session: { correo: "bodega@example.invalid", rol: "bodega" },
  prisma: {
    usuario: { findUnique: vi.fn(), update: vi.fn() },
    ordenCompra: { findMany: vi.fn(), count: vi.fn() },
    producto: { findMany: vi.fn() },
    bodega: { count: vi.fn() },
    movimientoKardex: { findMany: vi.fn() },
    log: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/dal", () => ({
  requirePermission: async (permission) =>
    m.permissions.includes(permission)
      ? { session: m.session }
      : {
          response: Response.json({ error: "No autorizado" }, { status: 403 }),
        },
  requireSession: async () =>
    m.session
      ? { session: m.session }
      : {
          response: Response.json({ error: "No autenticado" }, { status: 401 }),
        },
  getPermisos: async () => m.permissions,
}));
import { GET as receiving } from "../app/api/inventario/recepciones/route";
import { GET as logs } from "../app/api/inventario/logs/route";
import { GET as summary } from "../app/api/inventario/resumen/route";
import {
  GET as preferences,
  PATCH as savePreferences,
} from "../app/api/perfil/preferencias/route";
import { GET as purchaseProducts } from "../app/api/compras/productos/route";
import { GET as suppliers } from "../app/api/compras/proveedores/route";
import { POST as receive } from "../app/api/ordenes-compra/[id]/recepcion/route";
const request = (path, body) =>
  new Request(
    `https://arconet.test${path}`,
    body === undefined
      ? {}
      : {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.permissions = [];
  m.session = { correo: "bodega@example.invalid", rol: "bodega" };
  m.prisma.usuario.findUnique.mockResolvedValue({ temaPanel: "system" });
  m.prisma.usuario.update.mockImplementation(async ({ data }) => ({
    temaPanel: data.temaPanel,
  }));
  m.prisma.ordenCompra.findMany.mockResolvedValue([]);
  m.prisma.ordenCompra.count.mockResolvedValue(2);
  m.prisma.producto.findMany.mockResolvedValue([]);
  m.prisma.bodega.count.mockResolvedValue(1);
  m.prisma.movimientoKardex.findMany.mockResolvedValue([]);
  m.prisma.log.findMany.mockResolvedValue([]);
});
describe("apariencia personal sin permiso de configuración global", () => {
  it("cualquier cuenta autenticada lee únicamente su preferencia", async () => {
    const response = await preferences();
    expect(await response.json()).toEqual({ theme: "system" });
    expect(m.prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { correo: m.session.correo },
      select: { temaPanel: true },
    });
  });
  it.each(["light", "dark", "system"])(
    "guarda %s sin cambiar nombre ni otra cuenta",
    async (theme) => {
      const response = await savePreferences(
        request("/api/perfil/preferencias", {
          theme,
          correo: "otro@example.invalid",
          usuarioId: "otro",
          nombre: "No cambiar",
        }),
      );
      expect(response.status).toBe(200);
      expect(m.prisma.usuario.update).toHaveBeenCalledWith({
        where: { correo: m.session.correo },
        data: { temaPanel: theme },
        select: { temaPanel: true },
      });
    },
  );
  it.each([undefined, null, {}, "", false, "auto", "oscurito", "__proto__"])(
    "rechaza modo inválido: %j",
    async (theme) => {
      expect(
        (await savePreferences(request("/api/perfil/preferencias", { theme })))
          .status,
      ).toBe(400);
      expect(m.prisma.usuario.update).not.toHaveBeenCalled();
    },
  );
  it("sin sesión no lee ni escribe preferencias", async () => {
    m.session = null;
    expect((await preferences()).status).toBe(401);
    expect(
      (
        await savePreferences(
          request("/api/perfil/preferencias", { theme: "dark" }),
        )
      ).status,
    ).toBe(401);
    expect(m.prisma.usuario.update).not.toHaveBeenCalled();
  });
  it("un fallo de persistencia es recuperable", async () => {
    m.prisma.usuario.update.mockRejectedValue(new Error("db"));
    expect(
      (
        await savePreferences(
          request("/api/perfil/preferencias", { theme: "dark" }),
        )
      ).status,
    ).toBe(503);
  });
});
describe("área de inventario no equivale a reportes o logs globales", () => {
  it("resumen exige inventario:read", async () => {
    expect((await summary()).status).toBe(403);
    expect(m.prisma.producto.findMany).not.toHaveBeenCalled();
  });
  it("resumen no incluye ventas, importes ni costos y separa unidades de medida", async () => {
    m.permissions = ["inventario:read"];
    m.prisma.producto.findMany.mockResolvedValue([
      { stock: 3, stockMinimo: 5, unidad: "Pieza" },
      { stock: 7, stockMinimo: 1, unidad: "Metro" },
      { stock: 0, stockMinimo: 1, unidad: "Pieza" },
    ]);
    const response = await summary();
    expect(await response.json()).toEqual({
      productos: 3,
      agotados: 1,
      bajoMinimo: 1,
      bodegas: 1,
      unidadesPorUnidad: { Pieza: 3, Metro: 7 },
      recepcionesPendientes: null,
      movimientos: [],
    });
    expect(
      m.prisma.producto.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty("precio");
    expect(
      m.prisma.producto.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty("costo");
    expect(m.prisma.ordenCompra.count).not.toHaveBeenCalled();
  });
  it("pendientes de recepción sólo con capacidad explícita", async () => {
    m.permissions = ["inventario:read", "compras:receive"];
    expect((await (await summary()).json()).recepcionesPendientes).toBe(2);
  });
  it("no se puede pedir logs de ventas ni auth modificando filtros del área", async () => {
    m.permissions = ["inventario:read"];
    expect(
      (
        await logs(
          request(
            "/api/inventario/logs?scope=global&categoria=auth&ruta=/api/ordenes&nivel=error",
          ),
        )
      ).status,
    ).toBe(200);
    const query = m.prisma.log.findMany.mock.calls[0][0];
    expect(query.where.AND[0].OR).toContainEqual({
      ruta: { startsWith: "/api/inventario/" },
    });
    expect(JSON.stringify(query.where)).not.toContain("/api/auth");
    expect(JSON.stringify(query.where)).not.toContain(
      '"startsWith":"/api/ordenes"',
    );
    expect(query.where.AND[1]).toEqual({ nivel: "error" });
  });
  it("incluye stock retirado por otro módulo sin revelar importes o clientes de la venta", async () => {
    m.permissions = ["inventario:read"];
    m.prisma.movimientoKardex.findMany.mockResolvedValue([
      {
        id: "k",
        fecha: new Date("2026-10-30"),
        tipo: "salida",
        cantidad: 2,
        saldoAnterior: 5,
        saldoDespues: 3,
        actor: "vendedor",
        producto: { nombre: "Fibra", sku: "F" },
        bodega: { nombre: "Principal" },
      },
    ]);
    const rows = await (await logs(request("/api/inventario/logs"))).json();
    expect(rows[0].mensaje).toContain("salida");
    expect(rows[0].detalle).toContain("saldoDespues");
    const select = m.prisma.movimientoKardex.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("costoUnitario");
    expect(select).not.toHaveProperty("orden");
  });
  it("retirar inventario:read revoca el acceso aun con otros permisos", async () => {
    m.permissions = ["compras:read", "logs:delete"];
    expect((await logs(request("/api/inventario/logs"))).status).toBe(403);
  });
});
describe("recepción separada de edición de compras", () => {
  it.each(
    [
      [],
      ["compras:read"],
      ["inventario:read"],
      ["compras:write", "inventario:write"],
    ].map((permissions) => [permissions]),
  )(
    "consultar recepción requiere su permiso dedicado: %j",
    async (permissions) => {
      m.permissions = permissions;
      expect((await receiving()).status).toBe(403);
      expect(m.prisma.ordenCompra.findMany).not.toHaveBeenCalled();
    },
  );
  it("un receptor no necesita lectura financiera de compras y recibe DTO mínimo", async () => {
    m.permissions = ["compras:receive", "inventario:read"];
    m.prisma.ordenCompra.findMany.mockResolvedValue([
      {
        id: "o",
        numero: "OC",
        tipo: "compra",
        estado: "enviada",
        total: 9999,
        facturaProveedor: "privada",
        proveedor: { nombre: "Proveedor", rtn: "privado" },
        items: [
          {
            id: "i",
            nombre: "Fibra",
            productoId: "p",
            cantidad: 5,
            cantidadRecibida: 2,
            costoUnitario: 777,
          },
        ],
      },
    ]);
    const body = await (await receiving()).json();
    expect(body[0]).not.toHaveProperty("total");
    expect(body[0]).not.toHaveProperty("facturaProveedor");
    expect(body[0].proveedor).toEqual({ nombre: "Proveedor" });
    expect(body[0].items[0]).not.toHaveProperty("costoUnitario");
  });
  it("escritura de compras no concede entrada de inventario", async () => {
    m.permissions = ["compras:write", "inventario:write"];
    expect(
      (
        await receive(request("/api/ordenes-compra/o/recepcion", {}), {
          params: Promise.resolve({ id: "o" }),
        })
      ).status,
    ).toBe(403);
  });
  it("recibir tampoco concede movimientos si falta inventario:write", async () => {
    m.permissions = ["compras:receive"];
    expect(
      (
        await receive(request("/api/ordenes-compra/o/recepcion", {}), {
          params: Promise.resolve({ id: "o" }),
        })
      ).status,
    ).toBe(403);
  });
});
describe("referencias de abastecimiento", () => {
  it("inventario:read por sí solo no da acceso al costo de compras ni proveedores", async () => {
    m.permissions = ["inventario:read"];
    expect(
      (await purchaseProducts(request("/api/compras/productos"))).status,
    ).toBe(403);
    expect((await suppliers(request("/api/compras/proveedores"))).status).toBe(
      403,
    );
  });
  it("consulta de compras ofrece costos, nunca precios de venta ni fotos o auditoría", async () => {
    m.permissions = ["compras:read"];
    m.prisma.producto.findMany.mockResolvedValue([
      { id: "p", nombre: "Fibra", costo: 25 },
    ]);
    const response = await purchaseProducts(
      request("/api/compras/productos?q=FIBRA"),
    );
    expect(response.status).toBe(200);
    const query = m.prisma.producto.findMany.mock.calls[0][0];
    expect(query.where.archivado).toBe(false);
    expect(query.select.costo).toBe(true);
    expect(query.select).not.toHaveProperty("precio");
    expect(query.take).toBe(13);
    expect((await response.json()).items[0].costo).toBe(25);
  });
});
