import { describe, expect, it } from 'vitest';
import { PRINT_PAPERS, documentDate, esc, logoDataUrl, normalizePaper, printOptions, renderFiscalDocument, renderOrderDocument } from '../lib/print-document';
import { documento, order, settings } from './fixtures/print-documents';

describe('plantilla de impresión compartida',()=>{
  it('ofrece papel automático, hojas y recibos térmicos',()=>{
    expect(Object.keys(PRINT_PAPERS)).toEqual(['auto','carta','media-hoja','media-carta','ticket-80','ticket-58']);
    expect(PRINT_PAPERS['ticket-80']).toMatchObject({width:80,kind:'receipt'});
    expect(PRINT_PAPERS['ticket-58']).toMatchObject({width:58,kind:'receipt'});
    expect(PRINT_PAPERS['media-hoja']).toMatchObject({width:215.9,height:139.7});
    expect(PRINT_PAPERS.carta).toMatchObject({width:215.9,height:279.4});
    expect(PRINT_PAPERS['media-carta']).toMatchObject({width:139.7,height:215.9});
  });
  it.each([undefined,null,'A4','<script>','__proto__'])('descarta un formato desconocido: %s',value=>{
    expect(normalizePaper(value)).toBe('auto');
  });
  it('el formato puede solicitarse por query, sin insertar CSS arbitrario',()=>{
    expect(printOptions(new Request('https://arconet.test/api/doc?formato=media-carta&auto=1'))).toEqual({paper:'media-carta',autoPrint:true});
    expect(printOptions(new Request('https://arconet.test/api/doc?formato=%3Cscript%3E'))).toEqual({paper:'auto',autoPrint:false});
  });
  it('embebe el logo en el HTML y no depende de una ruta de imagen externa',()=>{
    expect(logoDataUrl()).toMatch(/^data:image\/png;base64,/);
    expect(renderOrderDocument({order,settings})).toContain('class="brand-logo" src="data:image/png;base64,');
    expect(renderOrderDocument({order,settings})).not.toMatch(/<img[^>]+src="https?:/);
  });
  it.each(Object.keys(PRINT_PAPERS))('conserva los datos de la cotización en %s',paper=>{
    const html=renderOrderDocument({order,settings,paper});
    for(const text of [order.id,order.cliente.nombre,order.cliente.rtn,order.cliente.correo,order.cliente.telefono,order.cliente.contacto,order.cliente.ciudad,settings['fiscal.nit'],settings['fiscal.direccion'],settings.phone,settings.email,'CAM-001','Cámara de seguridad','L 190.00','Válida hasta','15/11/2026',order.notas])expect(html).toContain(text);
    expect(html).toContain(`data-paper="${paper}"`);
    const p=PRINT_PAPERS[paper];
    expect(html).toContain(paper==='auto' ? '<style id="paper-rule">@page{size:auto;margin:12mm}' : `<style id="paper-rule">@page{size:${p.width}mm ${p.height}mm;margin:${p.margin}mm}`);
  });
  it('usa el vencimiento real o indica que no hay vigencia registrada',()=>{
    const html=renderOrderDocument({order:{...order,fechaVencimiento:null},settings});
    expect(html).toContain('Vigencia: no registrada');expect(html).not.toContain('Válida hasta:');
  });
  it('no inventa ISV ni recalcula el total comercial guardado',()=>{
    const html=renderOrderDocument({order:{...order,monto:350},settings});
    expect(html).toContain('L 350.00');expect(html).toContain('sin desglose fiscal');
    expect(html).not.toContain('ISV 15%');
  });
  it('incluye pagos confirmados y saldo, no pagos pendientes ni anulados',()=>{
    const html=renderOrderDocument({order:{...order,tipo:'venta',pagos:[
      {fecha:order.fecha,monto:50,metodo:'transferencia',estado:'confirmado',referencia:'REF-123'},
      {fecha:order.fecha,monto:90,metodo:'efectivo',estado:'pendiente',referencia:'NO-CONFIRMADO'},
      {fecha:order.fecha,monto:20,metodo:'tarjeta',estado:'anulado',referencia:'ANULADO'},
    ]},settings});
    for(const text of ['Factura comercial','REF-123','L 50.00','L 140.00','Saldo pendiente'])expect(html).toContain(text);
    expect(html).not.toContain('NO-CONFIRMADO');expect(html).not.toContain('ANULADO');
  });
  it('escapa nombres, notas y moneda; no ejecuta datos guardados',()=>{
    const attack='</script><img src=x onerror="alert(1)">';
    const html=renderOrderDocument({order:{...order,notas:attack,cliente:{...order.cliente,nombre:attack},items:[{...order.items[0],nombre:attack}]},settings:{...settings,currency:attack}});
    expect(html).not.toContain(attack);expect(html).toContain(esc(attack));expect(esc("'&\"<>")).toBe('&#39;&amp;&quot;&lt;&gt;');
  });
  it.each(Object.keys(PRINT_PAPERS))('conserva los datos fiscales y totales netos en %s',paper=>{
    const html=renderFiscalDocument({documento,settings,paper});
    for(const text of [documento.id,documento.ordenId,documento.emitidoPor,documento.pdfHash,documento.cliente.correo,'CAM-001','L 200.00','L 10.00','L 190.00','L 28.50','L 218.50','ISV 15%'])expect(html).toContain(text);
    expect(html).toContain('SIN VALIDEZ FISCAL');expect(html).not.toContain('válido como comprobante fiscal');
    expect(html).toContain('Rango autorizado: No registrado');
  });
  it('no asigna a un documento pendiente el CAI configurado después',()=>{
    const html=renderFiscalDocument({documento,settings:{...settings,'fiscal.cai':'CAI-NUEVO','fiscal.serie':'001'}});
    expect(html).toContain('SIN VALIDEZ FISCAL');expect(html).not.toContain('CAI-NUEVO');
  });
  it('respeta la moneda registrada del documento fiscal',()=>{
    const html=renderFiscalDocument({documento:{...documento,moneda:'USD'},settings});
    expect(html).toContain('USD 218.50');expect(html).not.toContain('L 218.50');
  });
  it('solo utiliza un rango si el CAI y la serie coinciden con el documento',()=>{
    const fiscalSettings={...settings,'fiscal.cai':'CAI-TEST','fiscal.serie':'001-001-01','fiscal.rangoInicio':'001-001-01-000000001','fiscal.rangoFin':'001-001-01-000000999','fiscal.fechaLimite':'2026-12-31'};
    const issued={...documento,cai:'CAI-TEST',serie:'001-001-01',correlativo:'001-001-01-000000003'};
    const html=renderFiscalDocument({documento:issued,settings:fiscalSettings});
    expect(html).toContain('31/12/2026');expect(html).toContain(fiscalSettings['fiscal.rangoFin']);expect(html).not.toContain('SIN VALIDEZ FISCAL');
    const old=renderFiscalDocument({documento:{...issued,cai:'CAI-OLD'},settings:fiscalSettings});
    expect(old).toContain('CAI-OLD');expect(old).not.toContain(fiscalSettings['fiscal.rangoFin']);expect(old).not.toContain('31/12/2026');
  });
  it.each(['nota_credito','nota_debito'])('conserva notas y documento relacionado en %s',tipo=>{
    const html=renderFiscalDocument({documento:{...documento,tipo,referenciaId:'FACT-ORIGEN',estado:'anulado',motivoAnulacion:'Error de cliente',anuladoAt:order.fecha},settings});
    expect(html).toContain('FACT-ORIGEN');expect(html).toContain('ANULADO · Error de cliente');expect(html).toContain(order.notas);
  });
  it('permite varias páginas sin ocultar filas y repite los encabezados',()=>{
    const items=Array.from({length:120},(_,i)=>({...order.items[0],nombre:`PRODUCTO-${i+1}`}));
    const html=renderOrderDocument({order:{...order,items},settings});
    expect(html).toContain('PRODUCTO-120');expect(html).toContain('table-header-group');expect(html).toContain('break-inside:avoid');expect(html).not.toContain('overflow:hidden');
  });
  it('el selector cambia CSS localmente, también al abrir desde blob',()=>{
    const html=renderOrderDocument({order,settings});
    expect(html).toContain('id="paper-size"');expect(html).toContain('document.body.dataset.paper=this.value');expect(html).toContain('image.decode()');expect(html).not.toContain('location.href');
  });
  it('no imprime automáticamente salvo solicitud explícita',()=>{
    expect(renderFiscalDocument({documento,settings})).not.toContain("window.addEventListener('load',printDocument)");
    expect(renderFiscalDocument({documento,settings,autoPrint:true})).toContain("window.addEventListener('load',printDocument)");
  });
  it('conserva fechas de calendario sin desplazarlas por el huso horario',()=>{
    expect(documentDate('2026-12-31')).toBe('31/12/2026');expect(documentDate(null)).toBe('No registrada');
    expect(documentDate('2026-10-28T02:00:00Z')).toBe('27/10/2026');
  });
});
