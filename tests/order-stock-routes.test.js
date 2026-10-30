import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  prisma: { orden: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }, clienteCuenta: { findUnique: vi.fn() }, $transaction: vi.fn() },
  tx: { producto: { findMany: vi.fn() }, $executeRaw: vi.fn(), orden: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() } },
  requirePermission: vi.fn(), requireSession: vi.fn(), getClientSession: vi.fn(),
  descontarStock: vi.fn(), revertirStock: vi.fn(), writeLog: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.requirePermission, requireSession: mocks.requireSession }));
vi.mock('@/lib/client-session', () => ({ getClientSession: mocks.getClientSession }));
vi.mock('@/lib/logs', () => ({ writeLog: mocks.writeLog }));
vi.mock('@/lib/stock-ventas', async importOriginal => ({ ...await importOriginal(), descontarStock: mocks.descontarStock, revertirStock: mocks.revertirStock }));
import { PATCH, DELETE } from '../app/api/ordenes/[id]/route';
import { POST, GET } from '../app/api/ordenes/route';
const items = [{ productoId: 'qa-p', nombre: 'QA', cantidad: 1, precio: 25 }];
let existing;
const request = data => new Request('https://arconet.test/api/ordenes/qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const patch = data => PATCH(request(data), { params: Promise.resolve({ id: 'qa' }) });
beforeEach(() => {
  vi.resetAllMocks();
  existing = { id: 'qa', tipo: 'cotizacion', estado: 'pendiente', monto: 25, clienteId: 'qa-c', items };
  mocks.requirePermission.mockResolvedValue({ session: { correo: 'qa@example.invalid' } });
  mocks.getClientSession.mockResolvedValue(null);
  mocks.prisma.orden.findMany.mockImplementation(async () => [existing]);
  mocks.prisma.clienteCuenta.findUnique.mockResolvedValue({ activo: true, cliente: { estado: "activo" } });
  mocks.prisma.orden.findUnique.mockImplementation(async () => existing);
  mocks.tx.producto.findMany.mockResolvedValue([{ id: "qa-p", nombre: "QA", precio: 25, precioDescuento: 22, precioMayorista: 20, archivado: false, estado: "activo" }]);
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

describe('precios de catálogo en órdenes, sin confiar en el navegador', () => {
  it.each([['normal', 25], ['descuento', 22], ['mayorista', 20]])('POST resuelve %s y recalcula el monto', async (nivelPrecio, expected) => {
    const response = await POST(request({ clienteId: 'qa-c', monto: 0.01, items: [{ ...items[0], nivelPrecio, precio: 0.01, cantidad: 2 }] }));
    expect(response.status).toBe(201);
    const saved = await response.json(); expect(saved.monto).toBe(expected * 2); expect(saved.items[0].precio).toBe(expected);
  });
  it('no permite falsear solo monto en PATCH cuando ya hay líneas', async () => {
    const response = await patch({ monto: 0.01, notas: 'Intento' });
    expect((await response.json()).monto).toBe(25);
  });
  it('conserva el monto histórico cuando no cambian las líneas', async () => {
    existing.monto = 24;
    const response = await patch({ monto: 0.01, items, notas: 'Nota sin cambio de cantidades' });
    expect((await response.json()).monto).toBe(24);
  });
});

describe('lectura de órdenes y regresión de snapshots en el listado', () => {
  it('el listado incluye id, tarifa, precio base y versión usados al reabrir el formulario', async () => {
    existing.items = [{ ...items[0], id: 'linea', nivelPrecio: 'descuento', precioBase: 30 }];
    const response = await GET(request({}));
    expect(response.status).toBe(200);
    const query = mocks.prisma.orden.findMany.mock.calls[0][0];
    expect(query.select.items.select).toMatchObject({ id: true, nivelPrecio: true, precioBase: true });
    expect(query.select.updatedAt).toBe(true);
    expect((await response.json())[0].items[0]).toMatchObject({ id: 'linea', nivelPrecio: 'descuento', precioBase: 30 });
  });
  it('solo ver precios no autoriza consultar la lista comercial', async () => {
    mocks.requirePermission.mockResolvedValue({ response: new Response(null, { status: 403 }) });
    expect((await GET(request({}))).status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith('ordenes:read'); expect(mocks.prisma.orden.findMany).not.toHaveBeenCalled();
  });
  it('el portal de cliente mantiene acceso solo a sus propias órdenes', async () => {
    mocks.getClientSession.mockResolvedValue({ clienteId: 'qa-c' });
    expect((await GET(request({}))).status).toBe(200);
    expect(mocks.prisma.orden.findMany.mock.calls[0][0].where.clienteId).toBe('qa-c');
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });
});

it('rechaza un formulario desactualizado antes de tocar líneas o inventario', async () => {
  existing.updatedAt = new Date('2026-10-29T20:00:00.000Z');
  expect((await patch({ updatedAt: '2026-10-29T19:00:00.000Z', items })).status).toBe(409);
  expect(mocks.tx.orden.update).not.toHaveBeenCalled(); expect(mocks.revertirStock).not.toHaveBeenCalled();
});

describe('detalle obligatorio sin romper históricos ni solicitudes del portal', () => {
  it.each([{}, { items: [] }])('rechaza un nuevo documento comercial sin líneas: %j', async detail => {
    const response = await POST(request({ clienteId: 'qa-c', tipo: 'venta', monto: 12500, ...detail }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it('permite una venta de conceptos, cantidades fraccionarias y total autoritativo', async () => {
    const response = await POST(request({ tipo: 'venta', clienteId: 'qa-c', monto: 9999, items: [{ nombre: 'Visita técnica', cantidad: 0.5, precio: 100.5 }] }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ monto: 50.25, items: [{ productoId: '', cantidad: 0.5, precio: 100.5 }] });
    expect(mocks.tx.producto.findMany).not.toHaveBeenCalled();
  });
  it('POST y PATCH suman los importes redondeados de cada línea', async () => {
    const detail = [{ nombre: 'Servicio A', cantidad: 0.003, precio: 5 }, { nombre: 'Servicio B', cantidad: 0.003, precio: 5 }];
    expect((await (await POST(request({ clienteId: 'qa-c', items: detail }))).json()).monto).toBe(0.04);
    expect((await (await patch({ items: detail })).json()).monto).toBe(0.04);
  });
  it('no permite borrar todo el detalle y sustituirlo por un monto libre', async () => {
    expect((await patch({ items: [], monto: 9999 })).status).toBe(400);
    expect(mocks.tx.orden.update).not.toHaveBeenCalled();
    expect(mocks.revertirStock).not.toHaveBeenCalled();
  });
  it.each([{}, { items: [] }])('editar cabecera de un histórico sin líneas conserva su importe: %j', async detail => {
    existing.items = []; existing.monto = 45000;
    const response = await patch({ ...detail, notas: 'Seguimiento', monto: 0.01 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ monto: 45000, notas: 'Seguimiento', items: [] });
    expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
  it.each([{}, { items: [] }])('una solicitud vacía necesita detalle antes de convertirse en venta: %j', async detail => {
    existing.items = [];
    expect((await patch({ ...detail, tipo: 'venta' })).status).toBe(400);
    expect(mocks.tx.orden.update).not.toHaveBeenCalled();
  });
  it('añadir líneas a un histórico sí sustituye el importe viejo por el cálculo', async () => {
    existing.items = []; existing.monto = 45000;
    const response = await patch({ items, tipo: 'venta' });
    expect(response.status).toBe(200); expect((await response.json()).monto).toBe(25);
    expect(mocks.descontarStock).toHaveBeenCalledOnce();
  });
  it('la cuenta de cliente aún puede solicitar una cotización sin productos ni tarifa', async () => {
    mocks.getClientSession.mockResolvedValue({ clienteId: 'qa-c', correo: 'cliente@example.invalid' });
    mocks.prisma.orden.create.mockResolvedValue({ id: 'solicitud-qa', clienteId: 'qa-c', tipo: 'cotizacion', monto: 0, items: [] });
    const response = await POST(request({ tipo: 'cotizacion', proyecto: 'Proyecto de prueba', descripcion: 'Solicito una visita', urgencia: 'normal', presupuesto: '' }));
    expect(response.status).toBe(201); expect((await response.json()).monto).toBe(0);
    expect(mocks.prisma.orden.create).toHaveBeenCalledOnce();
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.descontarStock).not.toHaveBeenCalled();
  });
});


it('enviar las mismas líneas al editar cabecera de una venta no mueve stock', async () => {
  existing.tipo = 'venta';
  const response = await patch({ items, notas: 'Sólo cabecera' });
  expect(response.status).toBe(200);
  expect(mocks.revertirStock).not.toHaveBeenCalled(); expect(mocks.descontarStock).not.toHaveBeenCalled();
});
it('editar cabecera de una venta histórica sin detalle tampoco revierte movimientos', async () => {
  existing.tipo = 'venta'; existing.items = [];
  expect((await patch({ items: [], notas: 'Histórico', monto: 0 })).status).toBe(200);
  expect(mocks.revertirStock).not.toHaveBeenCalled(); expect(mocks.descontarStock).not.toHaveBeenCalled();
});

it('verifica el límite con los precios autoritativos, no sólo con los importes enviados', async () => {
  mocks.tx.producto.findMany.mockResolvedValue([{ id: 'qa-p', nombre: 'Equipo', precio: 9999999999.99, archivado: false, estado: 'activo' }]);
  const response = await POST(request({ clienteId: 'qa-c', items: [{ ...items[0], cantidad: 2, precio: 0.01 }] }));
  expect(response.status).toBe(400); expect(mocks.tx.orden.create).not.toHaveBeenCalled();
});
it('actualizar sólo la tarifa de una venta cambia el total, no sus existencias', async () => {
  existing.tipo = 'venta'; existing.items = [{ ...items[0], id: 'linea-guardada' }];
  const response = await patch({ items: [{ ...existing.items[0], nivelPrecio: 'mayorista', actualizarPrecio: true }] });
  expect(response.status).toBe(200); expect((await response.json()).monto).toBe(20);
  expect(mocks.revertirStock).not.toHaveBeenCalled(); expect(mocks.descontarStock).not.toHaveBeenCalled();
});

it('reordenar líneas con su snapshot conserva el importe histórico y no mueve stock', async () => {
  const product = { ...items[0], id: 'linea-guardada', nivelPrecio: 'normal', precioBase: 30 };
  const service = { nombre: 'Servicio', cantidad: 0.5, precio: 60 };
  existing.tipo = 'venta'; existing.monto = 50; existing.items = [product, service];
  const response = await patch({ items: [service, { ...product, itemOriginalId: product.id }] });
  expect(response.status).toBe(200); expect((await response.json()).monto).toBe(50);
  expect(mocks.revertirStock).not.toHaveBeenCalled(); expect(mocks.descontarStock).not.toHaveBeenCalled();
});
