import { describe, expect, it } from 'vitest';
import { branchLabel, BRANCHES } from '../app/admin/workers-store';

describe('sucursales creadas desde el panel', () => {
  it('resuelve el nombre de una sucursal no predefinida', () => {
    expect(branchLabel('sucursal-nueva', [{ id: 'sucursal-nueva', nombre: 'Sucursal nueva' }])).toBe('Sucursal nueva');
  });
  it('admite las opciones del selector de trabajadores', () => {
    expect(branchLabel('nueva', [{ id: 'nueva', label: 'Nueva sede' }])).toBe('Nueva sede');
  });
  it('conserva los nombres históricos si el catálogo aún está cargando', () => {
    expect(branchLabel(BRANCHES[0].id, [])).toBe(BRANCHES[0].label);
  });
  it('no pierde una referencia cuyo nombre no está disponible', () => {
    expect(branchLabel('sin-permiso', [])).toBe('sin-permiso');
  });
});
