import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: { producto: { findMany: vi.fn() }, configuracionSistema: { findMany: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { POST } from '../app/api/cotizaciones/previo/route';

const settings = {
  companyName: 'Arconet', 'fiscal.nombre': 'Arconet, S.A.', 'fiscal.nit': '05019000123456',
  'fiscal.direccion': 'Barrio Centro, San Pedro Sula, Cortés', phone: '+504 2237-0000', email: 'contacto@arconet.local', currency: 'L',
  'fiscal.cai': 'CAI-2026-1234', 'fiscal.serie': '001-001-01',
  'fiscal.rangoInicio': '001-001-01-000000001', 'fiscal.rangoFin': '001-001-01-000000100',
  'fiscal.fechaLimite': '2027-06-30',
};
const producto = { id: 'p-gvf4', nombre: 'Gateway VoIP FXS de 4 puertos', sku: 'GVF4', precio: 50, unidad: 'Unidad', descripcion: 'Gateway VoIP FXS de 4 puertos' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.producto.findMany.mockResolvedValue([producto]);
  mocks.prisma.configuracionSistema.findMany.mockResolvedValue(Object.entries(settings).map(([clave, valor]) => ({ clave, valor })));
});

describe('previo de cotización del carrito', () => {
  it('renderiza el documento con autorización fiscal, firma y huella en el pie', async () => {
    const response = await POST(new Request('https://arconet.test/api/cotizaciones/previo', {
      method: 'POST',
      body: JSON.stringify({ items: [{ slug: 'p-gvf4', titulo: producto.nombre, cantidad: 2, presentacion: 'Unidad' }] }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    const html = await response.text();
    for (const text of ['Autorización fiscal', 'CAI: CAI-2026-1234', 'Serie: 001-001-01', 'Rango autorizado: 001-001-01-000000001 al 001-001-01-000000100', 'Firma / recibido conforme', 'Fecha de recepción', 'Huella SHA-256 del registro', 'Arconet · Conserve todas las páginas del documento.', 'Gracias por su preferencia']) expect(html).toContain(text);
    expect(html).toMatch(/Huella SHA-256 del registro: [0-9a-f]{64}/);
    expect(html).toContain('class="fiscal-footer"');
  });
  it('sin configuración fiscal muestra avisos de pendiencia', async () => {
    mocks.prisma.configuracionSistema.findMany.mockResolvedValue(Object.entries({ companyName: 'Arconet' }).map(([clave, valor]) => ({ clave, valor })));
    const response = await POST(new Request('https://arconet.test/api/cotizaciones/previo', {
      method: 'POST',
      body: JSON.stringify({ items: [{ slug: 'p-gvf4', titulo: producto.nombre, cantidad: 1, presentacion: 'Unidad' }] }),
    }));
    const html = await response.text();
    for (const text of ['CAI: Pendiente de asignación', 'Serie: No registrada', 'Rango autorizado: No registrado en este documento']) expect(html).toContain(text);
  });
  it('rechaza carrito vacío y productos fuera del catálogo', async () => {
    const vacio = await POST(new Request('https://arconet.test/api/cotizaciones/previo', { method: 'POST', body: JSON.stringify({ items: [] }) }));
    expect(vacio.status).toBe(400);
    mocks.prisma.producto.findMany.mockResolvedValue([]);
    const fuera = await POST(new Request('https://arconet.test/api/cotizaciones/previo', { method: 'POST', body: JSON.stringify({ items: [{ slug: 'no-existe', titulo: 'X', cantidad: 1, presentacion: 'Unidad' }] }) }));
    expect(fuera.status).toBe(400);
  });
});
