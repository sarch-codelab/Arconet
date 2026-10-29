export const settings = {
  companyName: 'Arconet', 'fiscal.nombre': 'Arconet, S.A.', 'fiscal.nit': '05019000123456',
  'fiscal.direccion': 'Barrio Centro, San Pedro Sula, Cortés', phone: '+504 2237-0000', email: 'contacto@arconet.local', currency: 'L',
};
export const cliente = { id:'cliente-1', nombre:'Cliente de prueba', rtn:'05019000987654', contacto:'María López', correo:'cliente@example.test', telefono:'+504 9999-0000', direccion:'Avenida Principal', ciudad:'San Pedro Sula' };
export const order = {
  id:'COT-2026-001', tipo:'cotizacion', fecha:'2026-10-28T15:00:00Z', fechaVencimiento:'2026-11-15T18:00:00Z',
  monto:190, descuento:10, estado:'aprobada', cliente, clienteId:cliente.id,
  items:[{nombre:'Cámara de seguridad', cantidad:2, precio:100, producto:{sku:'CAM-001',unidad:'Unidad'}}],
  notas:'Instalación incluida.\nEntrega en 5 días.', pagos:[],
};
export const documento = {
  id:'FISCAL-2026-001', tipo:'factura', cai:null, serie:null, correlativo:null, fecha:'2026-10-28T15:00:00Z',
  cliente, ordenId:order.id, orden:{id:order.id, notas:order.notas}, estado:'emitido',
  subtotal:190, descuento:10, impuesto:28.5, total:218.5, moneda:'HNL', emitidoPor:'admin@arconet.local', pdfHash:'a'.repeat(64),
  items:[{descripcion:'Cámara de seguridad', cantidad:2, precio:100, descuento:10, impuestoPorcentaje:15, subtotal:190, producto:{sku:'CAM-001',unidad:'Unidad'}}],
};
