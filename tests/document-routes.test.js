import { beforeEach, describe, expect, it, vi } from 'vitest';
import { documento, order, settings } from './fixtures/print-documents';
const mocks=vi.hoisted(()=>({
  prisma:{orden:{findUnique:vi.fn(),findFirst:vi.fn()},documentoFiscal:{findUnique:vi.fn()},configuracionSistema:{findMany:vi.fn()}},
  requirePermission:vi.fn(),requireClientSession:vi.fn(),
}));
vi.mock('@/lib/prisma',()=>({prisma:mocks.prisma}));
vi.mock('@/lib/dal',()=>({requirePermission:mocks.requirePermission}));
vi.mock('@/lib/portal-cliente',()=>({requireClientSession:mocks.requireClientSession}));
import { GET as adminDocument } from '../app/api/ordenes/[id]/documento/route';
import { GET as clientDocument } from '../app/api/cliente-portal/documentos/[id]/route';
import { GET as fiscalDocument } from '../app/api/facturacion/documentos/[id]/pdf/route';
const request=new Request('https://arconet.test/api/documento?formato=media-carta');
const context={params:Promise.resolve({id:order.id})};
beforeEach(()=>{
  vi.resetAllMocks();mocks.requirePermission.mockResolvedValue({session:{},response:null});
  mocks.requireClientSession.mockResolvedValue({session:{clienteId:order.clienteId},response:null});
  mocks.prisma.orden.findUnique.mockResolvedValue(order);mocks.prisma.orden.findFirst.mockResolvedValue(order);
  mocks.prisma.documentoFiscal.findUnique.mockResolvedValue(documento);
  mocks.prisma.configuracionSistema.findMany.mockResolvedValue(Object.entries(settings).map(([clave,valor])=>({clave,valor})));
});
describe('documentos autenticados',()=>{
  it.each(['auto','media-hoja','ticket-80','ticket-58'])('los tres accesos conservan el formato %s y la caché privada',async paper=>{
    const input=new Request(`https://arconet.test/api/documento?formato=${paper}`);
    for(const [get,id] of [[adminDocument,order.id],[clientDocument,order.id],[fiscalDocument,documento.id]]){
      const response=await get(input,{params:Promise.resolve({id})});
      expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(await response.text()).toContain(`data-paper="${paper}"`);
    }
  });
  it('admin y cliente usan exactamente la misma plantilla y tamaño',async()=>{
    const admin=await adminDocument(request,context);const client=await clientDocument(request,context);
    expect(admin.status).toBe(200);expect(client.status).toBe(200);
    expect(await admin.text()).toBe(await client.text());
    expect(mocks.prisma.orden.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:order.id,clienteId:order.clienteId}}));
    expect(admin.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('exige ordenes:read antes de consultar la orden',async()=>{
    mocks.requirePermission.mockResolvedValue({response:new Response('No autenticado',{status:401})});
    expect((await adminDocument(request,context)).status).toBe(401);
    expect(mocks.requirePermission).toHaveBeenCalledWith('ordenes:read');expect(mocks.prisma.orden.findUnique).not.toHaveBeenCalled();
  });
  it('exige el permiso fiscal propio y no acepta solo el de ventas',async()=>{
    mocks.requirePermission.mockResolvedValue({response:new Response('Sin permiso',{status:403})});
    expect((await fiscalDocument(request,context)).status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith('facturacion:read');expect(mocks.prisma.documentoFiscal.findUnique).not.toHaveBeenCalled();
  });
  it('no permite documentos a un cliente sin sesión activa',async()=>{
    mocks.requireClientSession.mockResolvedValue({response:new Response('No autenticado',{status:401})});
    expect((await clientDocument(request,context)).status).toBe(401);expect(mocks.prisma.orden.findFirst).not.toHaveBeenCalled();
  });
  it('devuelve 404 si la orden no pertenece al cliente, sin filtrar sus datos',async()=>{
    mocks.prisma.orden.findFirst.mockResolvedValue(null);
    const response=await clientDocument(request,{params:Promise.resolve({id:'orden-de-otro'})});
    expect(response.status).toBe(404);expect(await response.text()).not.toContain(order.cliente.nombre);
    expect(mocks.prisma.orden.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'orden-de-otro',clienteId:order.clienteId}}));
  });
  it('genera el documento fiscal con selección de papel y caché privada',async()=>{
    const response=await fiscalDocument(request,{params:Promise.resolve({id:documento.id})});
    expect(response.status).toBe(200);expect(await response.text()).toContain('data-paper="media-carta"');
    expect(response.headers.get('Content-Disposition')).toBe(`inline; filename="${documento.id}.html"`);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it.each([['orden',adminDocument],['fiscal',fiscalDocument]])('devuelve 404 cuando no existe el documento %s',async(kind,get)=>{
    mocks.prisma.orden.findUnique.mockResolvedValue(null);mocks.prisma.documentoFiscal.findUnique.mockResolvedValue(null);
    expect((await get(request,context)).status).toBe(404);
  });
});
