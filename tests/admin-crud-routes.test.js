import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  prisma: { categoria: { findUnique: vi.fn(), delete: vi.fn() }, producto: { count: vi.fn() } },
  requirePermission: vi.fn(), writeLog: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.requirePermission }));
vi.mock('@/lib/logs', () => ({ writeLog: mocks.writeLog }));
import { DELETE } from '../app/api/categorias/[id]/route';
const request = new Request('https://arconet.test/api/categorias/qa', { method: 'DELETE' });
const context = { params: Promise.resolve({ id: 'qa' }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePermission.mockResolvedValue({ session: { correo: 'qa@example.invalid' } });
  mocks.prisma.categoria.findUnique.mockResolvedValue({ id: 'qa', nombre: 'Categoría QA' });
  mocks.prisma.producto.count.mockResolvedValue(0);
});
describe('borrar categorías de acuerdo con el catálogo visible', () => {
  it('no deja que productos archivados para historial bloqueen una categoría vacía', async () => {
    expect((await DELETE(request, context)).status).toBe(200);
    expect(mocks.prisma.producto.count).toHaveBeenCalledWith({ where: { categoria: 'Categoría QA', archivado: false } });
    expect(mocks.prisma.categoria.delete).toHaveBeenCalledWith({ where: { id: 'qa' } });
    expect(mocks.writeLog).toHaveBeenCalledOnce();
  });
  it('protege categorías con productos vigentes', async () => {
    mocks.prisma.producto.count.mockResolvedValue(2);
    expect((await DELETE(request, context)).status).toBe(409);
    expect(mocks.prisma.categoria.delete).not.toHaveBeenCalled();
  });
  it('exige permiso de eliminación antes de consultar datos', async () => {
    mocks.requirePermission.mockResolvedValue({ response: new Response(null, { status: 403 }) });
    expect((await DELETE(request, context)).status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith('categorias:delete');
    expect(mocks.prisma.categoria.findUnique).not.toHaveBeenCalled();
  });
  it('responde 404 cuando la categoría ya no existe', async () => {
    mocks.prisma.categoria.findUnique.mockResolvedValue(null);
    expect((await DELETE(request, context)).status).toBe(404);
    expect(mocks.prisma.categoria.delete).not.toHaveBeenCalled();
  });
});
