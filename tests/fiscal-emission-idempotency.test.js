import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), lock: vi.fn(), find: vi.fn(), emit: vi.fn(), stock: vi.fn(), logs: vi.fn(), permissions: [] }));
vi.mock("../lib/prisma", () => ({ prisma: { $transaction: m.transaction } }));
vi.mock("../lib/dal", () => ({ requirePermission: async () => ({ session: { correo: "operator@qa.local" }, permisos: m.permissions, response: null }) }));
vi.mock("../lib/facturacion", () => ({ TIPOS_DOCUMENTO: ["factura","nota_credito","nota_debito"], emitirDocumentoFiscal: m.emit, invoiceRequestHash: () => "request-hash" }));
vi.mock("../lib/stock-ventas", () => ({ descontarStock: m.stock, tieneSalidas: vi.fn() }));
vi.mock("../lib/logs", () => ({ writeLog: m.logs }));
import { POST } from "../app/api/facturacion/documentos/route";
const key="00000000-0000-4000-8000-000000000001";
const request=(overrides={})=>new Request("https://arconet.test/api/facturacion/documentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clienteId:"qa",tipo:"factura",emissionKey:key,items:[{descripcion:"QA",cantidad:1,precio:100}],...overrides})});
const tx = { $executeRaw: m.lock, documentoFiscal: { findUnique: m.find } };
beforeEach(()=>{vi.clearAllMocks();m.permissions=["facturacion:read","facturacion:emit"];m.find.mockResolvedValue(null);m.transaction.mockImplementation(fn=>fn(tx));m.emit.mockResolvedValue({documento:{id:"new",total:115,items:[]},tieneRango:false});});
describe("referencia de envío del mismo borrador",()=>{
  it("la primera operación bloquea la referencia y consume stock una sola vez",async()=>{
    const r=await POST(request());expect(r.status).toBe(201);expect((await r.json()).replayed).toBe(false);expect(m.lock).toHaveBeenCalledOnce();expect(m.emit).toHaveBeenCalledWith(expect.objectContaining({emissionKey:key,emissionPayloadHash:"request-hash"}));expect(m.stock).toHaveBeenCalledOnce();
  });
  it("repetir devuelve el documento original sin volver a emitir, numerar, descontar ni loguear",async()=>{
    m.find.mockResolvedValue({id:"saved",emitidoPor:"operator@qa.local",emissionPayloadHash:"request-hash",total:115,cai:"QA",correlativo:"QA-1",items:[]});
    const r=await POST(request());expect(r.status).toBe(201);expect(await r.json()).toMatchObject({replayed:true,documento:{id:"saved"}});expect(m.emit).not.toHaveBeenCalled();expect(m.stock).not.toHaveBeenCalled();expect(m.logs).not.toHaveBeenCalled();
  });
  it("no reutiliza una referencia guardada con otros datos",async()=>{
    m.find.mockResolvedValue({id:"saved",emitidoPor:"operator@qa.local",emissionPayloadHash:"other"});const r=await POST(request());expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:"EMISSION_KEY_CONFLICT",documentoId:"saved"});expect(m.stock).not.toHaveBeenCalled();
  });
  it("una referencia de otro actor no devuelve su documento",async()=>{
    m.find.mockResolvedValue({id:"PRIVATE",emitidoPor:"other@qa.local",emissionPayloadHash:"request-hash"});const r=await POST(request());expect(r.status).toBe(409);expect(await r.text()).not.toContain("PRIVATE");expect(m.emit).not.toHaveBeenCalled();
  });
  it.each(["abc","",123,{},"00000000-0000-1000-8000-000000000001"])("rechaza referencia inválida %j antes de abrir transacción",async emissionKey=>{
    expect((await POST(request({emissionKey}))).status).toBe(400);expect(m.transaction).not.toHaveBeenCalled();
  });
  it("normaliza UUID a minúsculas",async()=>{
    const upper="AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";expect((await POST(request({emissionKey:upper}))).status).toBe(201);expect(m.find).toHaveBeenCalledWith(expect.objectContaining({where:{emissionKey:upper.toLowerCase()}}));
  });
  it("los clientes antiguos sin referencia conservan la emisión validada",async()=>{
    expect((await POST(request({emissionKey:null}))).status).toBe(201);expect(m.find).not.toHaveBeenCalled();expect(m.emit).toHaveBeenCalledOnce();
  });
});
