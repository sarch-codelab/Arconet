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
import InventarioPanel, { contarAlertasUnicas } from '../app/admin/inventario-panel';

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

describe('Alertas de reabastecimiento', () => {
  it('cuenta cada producto una sola vez aunque aparezca en agotados y bajo mínimo', () => {
    expect(contarAlertasUnicas({ agotados: [{ id: 'p1' }], alertas: [{ id: 'p1' }, { id: 'p2' }] })).toBe(2);
    expect(contarAlertasUnicas({ agotados: [], alertas: [{ id: 'p2' }] })).toBe(1);
    expect(contarAlertasUnicas({ agotados: [], alertas: [] })).toBe(0);
  });

  it('no falla sin datos de alertas', () => {
    expect(contarAlertasUnicas(undefined)).toBe(0);
    expect(contarAlertasUnicas({})).toBe(0);
    expect(contarAlertasUnicas({ alertas: undefined, agotados: undefined })).toBe(0);
  });
});
