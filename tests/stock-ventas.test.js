import { beforeEach, describe, expect, it, vi } from 'vitest';
const inventory = vi.hoisted(() => ({ aplicarMovimiento: vi.fn(), bodegaPrincipal: vi.fn() }));
vi.mock('@/lib/inventario', () => inventory);
import { descontarStock, revertirStock, tieneSalidas } from '../lib/stock-ventas';
import { parseOrden } from '../lib/ordenes';
const row = (cantidad, bodegaId = 'principal') => ({ productoId: 'qa-producto', bodegaId, cantidad, ordenId: 'qa-orden' });
function transaction(salidas, reversos = []) {
  return {
    $executeRaw: vi.fn().mockResolvedValue(0),
    movimientoKardex: {
      findMany: vi.fn(({ where }) => Promise.resolve(where.tipo === 'salida' ? salidas : reversos)),
      findFirst: vi.fn(({ where }) => Promise.resolve(where.tipo === 'salida' ? salidas[0] : reversos[0])),
    },
  };
}
beforeEach(() => { vi.resetAllMocks(); inventory.bodegaPrincipal.mockResolvedValue({ id: 'principal' }); });
describe('kardex: reversos netos e idempotencia después de editar', () => {
  it('devuelve una salida inicial', async () => {
    await revertirStock(transaction([row(3)]), { referencia: 'venta:qa' });
    expect(inventory.aplicarMovimiento).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipo: 'entrada', cantidad: 3 }));
  });
  it('no confunde un reverso anterior con el de la venta editada', async () => {
    await revertirStock(transaction([row(1), row(2)], [row(1)]), { referencia: 'venta:qa' });
    expect(inventory.aplicarMovimiento).toHaveBeenCalledTimes(1);
    expect(inventory.aplicarMovimiento).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cantidad: 2 }));
  });
  it('no devuelve dos veces un saldo ya compensado', async () => {
    await revertirStock(transaction([row(1), row(2)], [row(3)]), { referencia: 'venta:qa' });
    expect(inventory.aplicarMovimiento).not.toHaveBeenCalled();
  });
  it('conserva el origen por producto y bodega', async () => {
    await revertirStock(transaction([row(2), row(4, 'otra')], [row(1)]), { referencia: 'venta:qa' });
    expect(inventory.aplicarMovimiento).toHaveBeenCalledTimes(2);
    expect(inventory.aplicarMovimiento).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ bodegaId: 'principal', cantidad: 1 }));
    expect(inventory.aplicarMovimiento).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ bodegaId: 'otra', cantidad: 4 }));
  });
  it('las salidas históricas ya revertidas no cuentan como stock descontado', async () => {
    expect(await tieneSalidas(transaction([row(3)], [row(3)]), 'venta:qa')).toBe(false);
  });
  it('reconoce el saldo pendiente de una edición posterior', async () => {
    expect(await tieneSalidas(transaction([row(3), row(1)], [row(3)]), 'venta:qa')).toBe(true);
  });
  it('no redondea cantidades fraccionarias de productos con stock entero', async () => {
    await expect(descontarStock(transaction([]), { referencia: 'venta:qa', items: [{ productoId: 'qa', cantidad: 0.5 }] })).rejects.toMatchObject({ status: 400 });
    expect(inventory.aplicarMovimiento).not.toHaveBeenCalled();
  });
  it('los servicios sin producto pueden tener cantidades decimales', async () => {
    await descontarStock(transaction([]), { referencia: 'venta:qa', items: [{ productoId: null, cantidad: 0.5 }] });
    expect(inventory.aplicarMovimiento).not.toHaveBeenCalled();
  });
});
describe('cantidades del formulario comercial', () => {
  it('rechaza fracciones de un producto de catálogo antes de guardar', () => {
    expect(parseOrden({ items: [{ productoId: 'qa', nombre: 'QA', cantidad: 0.5, precio: 25 }] }, { partial: true }).errors).not.toEqual([]);
  });
  it('calcula el monto desde las líneas aunque se omita o se envíe otro total', () => {
    for (const monto of [undefined, 1]) {
      const parsed = parseOrden({ clienteId: 'qa', ...(monto === undefined ? {} : { monto }), items: [{ nombre: 'Medio servicio', cantidad: 0.5, precio: 25 }] });
      expect(parsed.errors).toEqual([]); expect(parsed.data.monto).toBe(12.5);
    }
  });
  it('acepta unidades enteras y conceptos libres decimales', () => {
    for (const [productoId, cantidad] of [['qa', 2], [null, 0.5]]) expect(parseOrden({ items: [{ productoId, nombre: 'QA', cantidad, precio: 25 }] }, { partial: true }).errors).toEqual([]);
  });
});
