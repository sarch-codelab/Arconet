import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({ prisma: {} }));

import { aplicarMovimiento } from "../lib/inventario";

const USERS = [
  { correo: "admin@arconet.test", rol: "administrador" },
  { correo: "gerente@arconet.test", rol: "gerente" },
  { correo: "ventas@arconet.test", rol: "ventas" },
  { correo: "bodega@arconet.test", rol: "bodega" },
  { correo: "tecnico@arconet.test", rol: "tecnico" },
];

function inventoryTx({ stock = 20, stockMinimo = 5 } = {}) {
  const producto = {
    id: "p-stock",
    nombre: "Cable de prueba",
    sku: "QA-STOCK",
    costo: 10,
    stock,
    stockMinimo,
  };
  const saldos = new Map([["b-principal", stock]]);
  const notificaciones = [];
  let correlativo = 0;

  const tx = {
    $executeRaw: vi.fn(async () => 1),
    producto: {
      findUnique: vi.fn(async () => ({ ...producto })),
      update: vi.fn(async ({ data }) => {
        Object.assign(producto, data);
        return { ...producto };
      }),
    },
    productoStock: {
      findUnique: vi.fn(async ({ where }) => {
        const { productoId, bodegaId } = where.productoId_bodegaId;
        if (productoId !== producto.id) return null;
        return { cantidad: saldos.get(bodegaId) ?? 0 };
      }),
      upsert: vi.fn(async ({ where, update, create }) => {
        const { bodegaId } = where.productoId_bodegaId;
        const cantidad = saldos.has(bodegaId) ? update.cantidad : create.cantidad;
        saldos.set(bodegaId, cantidad);
        return { cantidad };
      }),
      aggregate: vi.fn(async () => ({
        _sum: { cantidad: [...saldos.values()].reduce((total, cantidad) => total + cantidad, 0) },
      })),
    },
    movimientoKardex: {
      create: vi.fn(async ({ data }) => ({ id: `mov-${++correlativo}`, ...data })),
    },
    usuario: {
      findMany: vi.fn(async () => USERS.map(user => ({ ...user }))),
    },
    notificacion: {
      createMany: vi.fn(async ({ data }) => {
        notificaciones.push(...data);
        return { count: data.length };
      }),
    },
  };

  return { tx, producto, saldos, notificaciones };
}

const salida = cantidad => ({
  tipo: "salida",
  productoId: "p-stock",
  bodegaId: "b-principal",
  cantidad,
  actor: "ventas@arconet.test",
});

describe("alertas de stock al terminar un movimiento", () => {
  it("notifica a los cuatro roles al cruzar el mínimo, incluido quien registró la salida", async () => {
    const { tx, notificaciones } = inventoryTx();
    await aplicarMovimiento(tx, salida(16));

    expect(notificaciones).toHaveLength(4);
    expect(new Set(notificaciones.map(item => item.recipient))).toEqual(new Set([
      "admin@arconet.test",
      "gerente@arconet.test",
      "ventas@arconet.test",
      "bodega@arconet.test",
    ]));
    for (const item of notificaciones) {
      expect(item).toMatchObject({
        title: "Stock bajo",
        type: "stock",
        productoId: "p-stock",
      });
      expect(item.message).toContain("4");
      expect(item.message).toContain("5");
    }
  });

  it("no repite el aviso bajo el mínimo y conserva el aviso de agotado", async () => {
    const { tx, notificaciones } = inventoryTx({ stock: 6 });
    await aplicarMovimiento(tx, salida(1));
    await aplicarMovimiento(tx, salida(1));

    expect(notificaciones).toHaveLength(4);
    expect(notificaciones.every(item => item.title === "Stock bajo")).toBe(true);

    await aplicarMovimiento(tx, salida(4));
    expect(notificaciones).toHaveLength(8);
    expect(notificaciones.slice(4).every(item => item.title === "Producto agotado")).toBe(true);
  });

  it("no alerta si el total se mantiene por encima del mínimo", async () => {
    const { tx, notificaciones } = inventoryTx();
    await aplicarMovimiento(tx, salida(5));
    expect(notificaciones).toEqual([]);
  });

  it("evalúa una transferencia después de su contraparte y no crea un agotado falso", async () => {
    const { tx, producto, saldos, notificaciones } = inventoryTx();
    await aplicarMovimiento(tx, {
      tipo: "transferencia",
      productoId: "p-stock",
      bodegaId: "b-principal",
      bodegaDestinoId: "b-destino",
      cantidad: 20,
      actor: "bodega@arconet.test",
    });

    expect(producto.stock).toBe(20);
    expect(saldos.get("b-principal")).toBe(0);
    expect(saldos.get("b-destino")).toBe(20);
    expect(notificaciones).toEqual([]);
  });
});
