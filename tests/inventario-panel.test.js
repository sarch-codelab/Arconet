import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Reproduce la condición del incidente: el módulo de navegación cargado
// no expone el helper añadido posteriormente. Inventario debe montar igual.
vi.mock('../lib/admin-navigation', async importOriginal => ({
  ...await importOriginal(),
  canLookupInventoryProducts: undefined,
}));
vi.mock('../app/toaster', () => ({ sileo: { success: vi.fn(), error: vi.fn() } }));
import InventarioPanel from '../app/admin/inventario-panel';

const render = session => renderToStaticMarkup(createElement(InventarioPanel, { session }));

describe('Inventario: montaje sin depender de exports de navegación', () => {
  it.each([
    ['administración', ['inventario:read', 'inventario:write', 'inventario:delete', 'productos:read']],
    ['inventario sin acceso al módulo Productos', ['inventario:read', 'inventario:write']],
    ['solo lectura', ['inventario:read']],
    ['permisos vacíos', []],
    ['permisos ausentes', undefined],
    ['permisos nulos', null],
  ])('muestra Inventario y sus cinco pestañas para %s', (_role, permisos) => {
    const html = render({ nombre: 'QA', permisos });
    expect(html).toContain('Secciones de inventario');
    for (const label of ['Stock', 'Kardex', 'Movimientos', 'Bodegas', 'Alertas']) expect(html).toContain(label);
    expect(html).toContain('Resumen de inventario');
    expect(html).not.toContain('No se pudo mostrar');
  });
  it('no falla antes de recibir una sesión', () => {
    expect(() => render(undefined)).not.toThrow();
    expect(() => render(null)).not.toThrow();
  });
});
