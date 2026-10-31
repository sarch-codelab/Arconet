import { describe, expect, it, vi } from "vitest";
import { loadFiscalSettings, saveFiscalSettings } from "../lib/fiscal-settings-service";
import { FISCAL_FIELDS } from "../lib/fiscal-settings";
const base = { cai: "QA-SIN-VALIDEZ", serie: "999-999-01", correlativo: "1", rangoInicio: "999-999-01-000000001", rangoFin: "999-999-01-000000003", fechaLimite: "2099-12-31", nit: "00000000000000", nombre: "EMPRESA QA SIN VALIDEZ", direccion: "Pruebas locales" };
function database(config = base, issued = []) {
  const rows = new Map(Object.entries(config).map(([key, value]) => [`fiscal.${key}`, String(value)]));
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    configuracionSistema: { findMany: vi.fn(async () => [...rows].map(([clave, valor]) => ({ clave, valor }))), upsert: vi.fn(async q => { rows.set(q.where.clave, q.update.valor); return {}; }) },
    documentoFiscal: { findMany: vi.fn().mockResolvedValue(issued.map(n => ({ correlativo: `999-999-01-${String(n).padStart(9, "0")}` }))) },
    log: { create: vi.fn().mockResolvedValue({}) },
  };
  return { tx, db: { $transaction: vi.fn(async callback => callback(tx)) }, rows };
}
async function body(tx, changes = {}) { const cfg = await loadFiscalSettings(tx); return { ...cfg, ...changes, confirmado: true }; }
describe("cambios empresariales fiscales atómicos y sin reutilización de números", () => {
  it("guarda con el mismo bloqueo de emisión, revisión y auditoría", async () => {
    const { db, tx, rows } = database(); const result = await saveFiscalSettings(db, await body(tx, { nombre: "EMPRESA QA NUEVA" }), "qa@arconet.local");
    expect(result.nombre).toBe("EMPRESA QA NUEVA"); expect(rows.get("fiscal.nombre")).toBe("EMPRESA QA NUEVA");
    expect(tx.$executeRaw.mock.calls[0][0].join("")).toContain("fiscal-correlativo");
    expect(tx.log.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actor: "qa@arconet.local" }) }));
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "ReadCommitted" }));
  });
  it("una revisión antigua no pisa un correlativo actualizado", async () => {
    const { db, tx } = database(); await expect(saveFiscalSettings(db, { ...base, revision: "antigua", confirmado: true }, "qa")).rejects.toMatchObject({ status: 409 });
    expect(tx.configuracionSistema.upsert).not.toHaveBeenCalled(); expect(tx.log.create).not.toHaveBeenCalled();
  });
  it("sin confirmación no modifica campos sensibles", async () => {
    const { db, tx } = database(); await expect(saveFiscalSettings(db, { ...await body(tx, { nombre: "Otra" }), confirmado: false }, "qa")).rejects.toMatchObject({ status: 400 });
    expect(tx.configuracionSistema.upsert).not.toHaveBeenCalled();
  });
  it("ni siquiera una factura anulada permite reutilizar su número", async () => {
    const { db, tx } = database({ ...base, correlativo: "3" }, [1, 2]);
    await expect(saveFiscalSettings(db, await body(tx, { correlativo: "1" }), "qa")).rejects.toMatchObject({ status: 409 });
    expect(tx.configuracionSistema.upsert).not.toHaveBeenCalled();
  });
  it("un nuevo CAI no puede solapar números emitidos", async () => {
    const { db, tx } = database({ ...base, correlativo: "3" }, [1, 2]);
    await expect(saveFiscalSettings(db, await body(tx, { cai: "OTRA QA" }), "qa")).rejects.toMatchObject({ status: 409 });
  });
  it("renovar a un rango posterior no renumera documentos previos", async () => {
    const { db, tx } = database({ ...base, correlativo: "3" }, [1, 2]);
    const result = await saveFiscalSettings(db, await body(tx, { cai: "NUEVA QA", rangoInicio: "4", rangoFin: "6", correlativo: "4" }), "qa");
    expect(result.rangoInicio).toBe("999-999-01-000000004"); expect(result.correlativo).toBe(4);
    expect(tx.documentoFiscal.findMany).toHaveBeenCalled();
  });
  it("no borra una autorización que tiene documentos numerados", async () => {
    const { db, tx } = database(base, [1]);const empty = Object.fromEntries(FISCAL_FIELDS.map(key => [key, ""]));
    await expect(saveFiscalSettings(db, { ...empty, revision: (await loadFiscalSettings(tx)).revision, confirmado: true }, "qa")).rejects.toMatchObject({ status: 409 });
  });
  it("sin cambios no vuelve a escribir ni auditar", async () => {
    const { db, tx } = database();await saveFiscalSettings(db, await body(tx), "qa");expect(tx.configuracionSistema.upsert).not.toHaveBeenCalled();expect(tx.log.create).not.toHaveBeenCalled();
  });
  it("la configuración incompleta se rechaza antes de escribir", async () => {
    const { db, tx } = database(); await expect(saveFiscalSettings(db, { cai: "QA", serie: "999-999-01", correlativo: 1 }, "qa")).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled(); expect(tx.configuracionSistema.upsert).not.toHaveBeenCalled();
  });
});
