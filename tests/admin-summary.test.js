import { describe, expect, it } from 'vitest';
import { summarizeCommercialOrders } from '../lib/admin-summary';
describe('Resumen: cotizaciones y ventas no se confunden', () => {
  it('separa tipos y resta descuentos sin contar facturas fiscales', () => {
    expect(summarizeCommercialOrders([
      { tipo: 'cotizacion', estado: 'pendiente', monto: 1000 },
      { tipo: 'cotizacion', estado: 'aprobada', monto: 500 },
      { tipo: 'venta', estado: 'completada', monto: 100, descuento: 10 },
      { tipo: 'factura', estado: 'emitido', monto: 9999 },
    ])).toEqual({ quotes: 2, pendingQuotes: 1, sales: 1, salesAmount: 90 });
  });
  it('no suma ventas canceladas o rechazadas como vigentes', () => {
    expect(summarizeCommercialOrders([{ tipo: 'venta', estado: 'cancelada', monto: 500 }, { tipo: 'venta', estado: 'rechazada', monto: 500 }]).salesAmount).toBe(0);
  });
  it('soporta decimales serializados sin mostrar NaN ni importes negativos', () => {
    expect(summarizeCommercialOrders([{ tipo: 'venta', monto: '10.50', descuento: '0.25' }, { tipo: 'venta', monto: 3, descuento: 5 }, { tipo: 'venta', monto: 'inválido' }]).salesAmount).toBe(10.25);
  });
  it('un listado vacío no crea ventas ni cotizaciones', () => {
    expect(summarizeCommercialOrders()).toEqual({ quotes: 0, pendingQuotes: 0, sales: 0, salesAmount: 0 });
  });
});
