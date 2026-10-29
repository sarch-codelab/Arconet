import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  prisma: { orden: { findUnique: vi.fn() }, $transaction: vi.fn() },
  tx: { $executeRaw: vi.fn(), orden: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() } },
  requirePermission: vi.fn(), requireSession: vi.fn(), getClientSession: vi.fn(),
  descontarStock: vi.fn(), revertirStock: vi.fn(), writeLog: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.requirePermission, requireSession: mocks.requireSession }));
vi.mock('@/lib/client-session', () => ({ getClientSession: mocks.getClientSession }));
vi.mock('@/lib/logs', () => ({ writeLog: mocks.writeLog }));
vi.mock('@/lib/stock-ventas', async importOriginal => ({ ...await importOriginal(), descontarStock: mocks.descontarStock, revertirStock: mocks.revertirStock }));
import { PATCH, DELETE } from '../app/api/ordenes/[id]/route';
import { POST } from '../app/api/ordenes/route';
const items = [{ productoId: 'qa-p', nombre: 'QA', cantidad: 1, precio: 25 }];
let existing;
const request = data => new Request('https://arconet.test/api/ordenes/qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const patch = data => PATCH(request(data), { params: Promise.resolve({ id: 'qa' }) });
beforeEach(() => {
  vi.resetAllMocks();
  existing = { id: 'qa', tipo: 'cotizacion', estado: 'pendiente', monto: 25, clienteId: 'qa-c', items };
  mocks.requirePermission.mockResolvedValue({ session: { correo: 'qa@example.invalid' } });
  mocks.getClientSession.mockResolvedValue(null);
  mocks.prisma.orden.findUnique.mockImplementation(async () => existing);
  mocks.tx.orden.findUnique.mockImplementation(async () => existing);
  mocks.tx.orden.delete.mockImplementation(async () => existing);
  mocks.prisma.$transaction.mockImplementation(async callback => callback(mocks.tx));
  mocks.tx.orden.update.mockImplementation(async ({ data }) => ({ ...existing, ...data, items: data.items?.create || existing.items }));
  mocks.tx.orden.create.mockImplementation(async ({ data }) => ({ ...data, items: data.items?.create || [] }));
});
describe('transiciones comerciales y existencias', () => {
  it('convertir una cotización a venta descuenta sus líneas guardadas', async () => {
    expect((await patch({ tipo: 'venta' })).status).toBe(200);
    expect(mocks.descontarStock).toHaveBeenCalledOnce();
  });
  it('volver una venta a cotización devuelve el stock y no lo descuenta otra vez', async () => {
    existing.tipo = 'venta';
    expect((await patch({ tipo: 'cotizacion', items })).status).toBe(200);
    expect(mocks.revertirStock).toHaveBeenCalledOnce();
    expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it('editar cantidades vuelve a sincronizar la venta', async () => {
    existing.tipo = 'venta';
    expect((await patch({ items: [{ ...items[0], cantidad: 2 }] })).status).toBe(200);
    expect(mocks.revertirStock).toHaveBeenCalledOnce(); expect(mocks.descontarStock).toHaveBeenCalledOnce();
  });
  it('cancelar una venta solo devuelve existencias', async () => {
    existing.tipo = 'venta';
    expect((await patch({ estado: 'cancelada' })).status).toBe(200);
    expect(mocks.revertirStock).toHaveBeenCalledOnce(); expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it('reactivar una venta cancelada descuenta de nuevo', async () => {
    existing.tipo = 'venta'; existing.estado = 'cancelada';
    expect((await patch({ estado: 'pendiente' })).status).toBe(200);
    expect(mocks.descontarStock).toHaveBeenCalledOnce();
  });
  it('editar solo notas no mueve stock', async () => {
    existing.tipo = 'venta';
    expect((await patch({ notas: 'QA' })).status).toBe(200);
    expect(mocks.revertirStock).not.toHaveBeenCalled(); expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it.each(['cancelada', 'rechazada'])('crear una venta %s no descuenta inventario', async estado => {
    expect((await POST(request({ tipo: 'venta', estado, clienteId: 'qa-c', items }))).status).toBe(201);
    expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it('crear una venta vigente sí descuenta inventario', async () => {
    expect((await POST(request({ tipo: 'venta', estado: 'pendiente', clienteId: 'qa-c', items }))).status).toBe(201);
    expect(mocks.descontarStock).toHaveBeenCalledOnce();
  });
  it('lee el estado dentro de la transacción después de bloquear la orden', async () => {
    await patch({ tipo: 'venta' });
    expect(mocks.tx.$executeRaw).toHaveBeenCalledOnce();
    expect(mocks.tx.orden.findUnique).toHaveBeenCalledOnce();
    expect(mocks.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.tx.orden.findUnique.mock.invocationCallOrder[0]);
    expect(mocks.prisma.orden.findUnique).not.toHaveBeenCalled();
  });
  it('devuelve 404 sin escribir si desapareció la orden', async () => {
    existing = null;
    expect((await patch({ tipo: 'venta' })).status).toBe(404);
    expect(mocks.tx.orden.update).not.toHaveBeenCalled();
  });
  it('el borrado devuelve cualquier saldo pendiente después de bloquear/eliminar la orden', async () => {
    const response = await DELETE(request({}), { params: Promise.resolve({ id: 'qa' }) });
    expect(response.status).toBe(200);
    expect(mocks.tx.orden.delete).toHaveBeenCalledOnce(); expect(mocks.revertirStock).toHaveBeenCalledOnce();
    expect(mocks.tx.orden.delete.mock.invocationCallOrder[0]).toBeLessThan(mocks.revertirStock.mock.invocationCallOrder[0]);
  });
  it('no actualiza datos sin permiso de escritura', async () => {
    mocks.requirePermission.mockResolvedValue({ response: new Response(null, { status: 403 }) });
    expect((await patch({ tipo: 'venta' })).status).toBe(403); expect(mocks.prisma.orden.findUnique).not.toHaveBeenCalled();
  });
});
