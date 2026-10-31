import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { emitirDocumentoFiscal, invoiceRequestHash, huellaDocumento } from "../lib/facturacion";
const fields = { cai: "QA SIN VALIDEZ", serie: "999-999-01", correlativo: "1", rangoInicio: "1", rangoFin: "3", fechaLimite: "2099-12-31", nit: "00000000000000", nombre: "EMISOR QA ORIGINAL", direccion: "Dirección QA" };
function transaction(config = fields) {
  const values = new Map(Object.entries(config).map(([key,value])=>[`fiscal.${key}`,String(value)]));
  const tx = { $executeRaw: vi.fn().mockResolvedValue(0), configuracionSistema: { findMany: vi.fn(async()=>[...values].map(([clave,valor])=>({clave,valor}))), update: vi.fn(async q=>values.set(q.where.clave,q.data.valor)) }, documentoFiscal: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() } };
  let stored;
  tx.documentoFiscal.create.mockImplementation(async ({data})=>stored={...data,id:"qa-document",fecha:new Date("2026-10-31T12:00:00Z"),items:data.items.create});
  tx.documentoFiscal.update.mockImplementation(async ({data})=>({...stored,...data}));return{tx,values};
}
const args={tipo:"factura",clienteId:"qa",actor:"qa@local",items:[{descripcion:"Servicio QA",cantidad:1,precio:100,descuento:0,impuestoPorcentaje:15}]};
describe("emisión usa la configuración empresarial bajo el mismo bloqueo",()=>{
  it("reserva un número del rango, captura el emisor y preserva la referencia de envío",async()=>{
    const{tx,values}=transaction();const result=await emitirDocumentoFiscal({...args,tx,emissionKey:"qa-key",emissionPayloadHash:"qa-hash"});
    expect(result.tieneRango).toBe(true);expect(result.documento.correlativo).toBe("999-999-01-000000001");expect(values.get("fiscal.correlativo")).toBe("2");
    expect(result.documento).toMatchObject({emissionKey:"qa-key",emissionPayloadHash:"qa-hash",fiscalSnapshot:{version:1,nombre:"EMISOR QA ORIGINAL"}});
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.configuracionSistema.findMany.mock.invocationCallOrder[0]);
  });
  it.each([{fechaLimite:"2000-01-01"},{correlativo:"4"},{rangoFin:""},{nit:""}])("bloquea autorización inválida %j antes de numerar o crear",async change=>{
    const{tx}=transaction({...fields,...change});await expect(emitirDocumentoFiscal({...args,tx})).rejects.toMatchObject({status:409});expect(tx.configuracionSistema.update).not.toHaveBeenCalled();expect(tx.documentoFiscal.create).not.toHaveBeenCalled();
  });
  it("la ausencia total de autorización mantiene registro pendiente sin inventar número o CAI",async()=>{
    const{tx}=transaction({nombre:"PRUEBA SIN VALIDEZ"});const result=await emitirDocumentoFiscal({...args,tx});expect(result.tieneRango).toBe(false);expect(result.documento).toMatchObject({cai:null,serie:null,correlativo:null});expect(tx.configuracionSistema.update).not.toHaveBeenCalled();
  });
  it("un número existente no se reutiliza aunque el contador se haya alterado",async()=>{
    const{tx}=transaction();tx.documentoFiscal.findFirst.mockResolvedValue({id:"existing"});await expect(emitirDocumentoFiscal({...args,tx})).rejects.toMatchObject({status:409});expect(tx.documentoFiscal.create).not.toHaveBeenCalled();expect(tx.configuracionSistema.update).not.toHaveBeenCalled();
  });
  it("el hash de intención ignora la referencia pero detecta una venta distinta",()=>{
    const a={...args,impuestoPorcentaje:15,emissionKey:"one"};expect(invoiceRequestHash(a)).toBe(invoiceRequestHash({...a,emissionKey:"two"}));expect(invoiceRequestHash(a)).not.toBe(invoiceRequestHash({...a,items:[{...args.items[0],cantidad:2}]}));
  });
  it("la huella de nuevos documentos protege correlativo e instantánea del emisor",()=>{
    const doc={id:"qa",cai:"QA",fecha:"2026-10-31",total:115,subtotal:100,descuento:0,impuesto:15,correlativo:"QA-1",fiscalSnapshot:{version:1,nombre:"Original"}};
    expect(huellaDocumento(doc,[])).not.toBe(huellaDocumento({...doc,correlativo:"QA-2"},[]));expect(huellaDocumento(doc,[])).not.toBe(huellaDocumento({...doc,fiscalSnapshot:{version:1,nombre:"Nuevo"}},[]));
  });
});
