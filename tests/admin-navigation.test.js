import { readFileSync } from "node:fs";
import { describe, expect, it } from 'vitest';
import { adminSectionUrl, defaultAdminSection, normalizeAdminSection, resolveAdminSection, resolveFiscalTab, allowedSalesTabs, canLookupInventoryProducts } from '../lib/admin-navigation';
import { ALL_PERMISSIONS } from '../lib/permisos';
const base='https://arconet.test/panel-administrativo';

describe('navegación del panel y Ventas',()=>{
  it('Ventas tiene prioridad sobre un hash antiguo de Trabajadores',()=>{
    expect(resolveAdminSection(`${base}?section=ventas#trabajadores`,ALL_PERMISSIONS,'trabajadores')).toBe('ventas');
  });
  it('limpia el hash al pulsar una píldora y mantiene otros parámetros',()=>{
    expect(adminSectionUrl(`${base}?filtro=activo&section=trabajadores#trabajadores`,'ventas')).toBe(`${base}?filtro=activo&section=ventas`);
  });
  it('conserva enlaces legados que solo tienen hash',()=>{
    expect(resolveAdminSection(`${base}#ventas`,ALL_PERMISSIONS,'resumen')).toBe('ventas');
  });
  it.each(['facturas','facturacion','cotizaciones'])('normaliza %s como Ventas',alias=>{
    expect(normalizeAdminSection(alias)).toBe('ventas');
    expect(defaultAdminSection(['facturacion:read'],alias)).toBe('ventas');
    expect(resolveAdminSection(`${base}?section=${alias}#trabajadores`,ALL_PERMISSIONS,'resumen')).toBe('ventas');
    expect(adminSectionUrl(base,alias)).toBe(`${base}?section=ventas`);
  });
  it('volver al historial sin query recupera la sección inicial, no la última',()=>{
    expect(resolveAdminSection(base,ALL_PERMISSIONS,'resumen')).toBe('resumen');
  });
  it('no permite que un hash autorizado se imponga a una query inválida',()=>{
    expect(resolveAdminSection(`${base}?section=inexistente#trabajadores`,ALL_PERMISSIONS,'resumen')).toBe('resumen');
  });
  it('no abre secciones para las que el rol no tiene permiso',()=>{
    expect(resolveAdminSection(`${base}?section=trabajadores`,['ordenes:read'],'ventas')).toBe('ventas');
    expect(resolveAdminSection(`${base}#trabajadores`,['ordenes:read'],'ventas')).toBe('ventas');
  });
  it('no usa Trabajadores como respaldo para un rol sin permisos',()=>{
    expect(defaultAdminSection([],'trabajadores')).toBe('mi-perfil');
  });
  it('prefiere Resumen cuando no hay sección solicitada',()=>{
    expect(defaultAdminSection(ALL_PERMISSIONS)).toBe('resumen');
  });
});

describe('píldoras internas y permisos de Ventas', () => {
  const tabs = ['todas', 'cotizaciones', 'ventas', 'pendientes', 'aprobadas', 'completadas', 'facturas'].map(id => ({ id }));
  it.each(['documentos', 'nueva', 'libro', 'config'])('Facturas no bloquea la pestaña interna %s', inner => {
    expect(resolveFiscalTab('facturas', inner)).toBe(inner);
    expect(resolveFiscalTab(undefined, inner)).toBe(inner);
  });
  it.each(['documentos', 'nueva', 'libro', 'config'])('admite la selección interna controlada %s', tab => {
    expect(resolveFiscalTab(tab, 'documentos')).toBe(tab);
  });
  it('usa Documentos como respaldo seguro', () => {
    expect(resolveFiscalTab('facturas')).toBe('documentos');
    expect(resolveFiscalTab('todas', 'desconocida')).toBe('documentos');
  });
  it('un vendedor no ve facturación sin su permiso fiscal', () => {
    expect(allowedSalesTabs(tabs, ['ordenes:read'])).toEqual(tabs.slice(0, -1));
  });
  it('un rol fiscal consulta ventas en las píldoras compartidas, sin conceder cotizaciones', () => {
    expect(allowedSalesTabs(tabs, ['facturacion:read'])).toEqual([{ id: 'todas' }, { id: 'ventas' }, { id: 'completadas' }]);
  });
  it('retira Facturas incluso para administración', () => {
    expect(allowedSalesTabs(tabs, ALL_PERMISSIONS)).toEqual(tabs.slice(0, -1));
  });
  it('no muestra pestañas con permisos ausentes o solo de escritura', () => {
    for (const permisos of [undefined, null, [], ['ordenes:write'], ['facturacion:write']]) {
      expect(allowedSalesTabs(tabs, permisos)).toEqual([]);
    }
  });
});


describe('píldoras desplazables en móvil', () => {
  it('permite desplazar hasta secciones inactivas sin volver forzosamente a la activa', () => {
    const css = readFileSync(new URL('../app/admin/admin-experience.module.css', import.meta.url), 'utf8');
    for (const selector of ['pillItem', 'pillIconOnly']) {
      const block = css.match(new RegExp('\\.' + selector + '\\s*\\{([^}]+)\\}'))?.[1];
      expect(block).toMatch(/scroll-snap-align:\s*center/);
    }
  });
});

describe('catálogo de apoyo de inventario', () => {
  it('incluye SKUs sin existencias para un rol de inventario sin productos:read', () => {
    expect(canLookupInventoryProducts(['inventario:read', 'inventario:write'])).toBe(true);
    expect(defaultAdminSection(['inventario:read'], 'productos')).toBe('inventario');
  });
  it('no concede consultas a roles sin lectura de inventario ni productos', () => {
    for (const permisos of [undefined, null, [], ['inventario:write'], ['ordenes:read']]) expect(canLookupInventoryProducts(permisos)).toBe(false);
    expect(canLookupInventoryProducts(['productos:read'])).toBe(true);
  });
});

describe('pestaña independiente de tarifas en Ventas', () => {
  const tabs = ['todas', 'precios', 'facturas'].map(id => ({ id }));
  it('un lector de precios entra a Ventas sin acceso comercial ni fiscal', () => {
    expect(defaultAdminSection(['precios:read'])).toBe('ventas');
    expect(allowedSalesTabs(tabs, ['precios:read'])).toEqual([{ id: 'precios' }]);
  });
  it('los permisos comerciales/fiscales no conceden gestión de tarifas', () => {
    expect(allowedSalesTabs(tabs, ['ordenes:read', 'facturacion:read'])).toEqual([{ id: 'todas' }]);
    expect(allowedSalesTabs(tabs, ['precios:write'])).toEqual([]);
  });
});
