import { createHash } from "node:crypto";
import { FISCAL_FIELDS, FISCAL_CONFIG_KEYS, fiscalConfigFromRows, fiscalReadiness, fiscalBound, parseFiscalSettings } from "./fiscal-settings";

export function fiscalSettingsRevision(config) {
  return createHash("sha256").update(JSON.stringify(FISCAL_FIELDS.map(field => [field, String(config[field] ?? "")]))).digest("hex");
}
export async function loadFiscalSettings(db) {
  const rows = await db.configuracionSistema.findMany({ where: { clave: { in: FISCAL_CONFIG_KEYS } }, select: { clave: true, valor: true } });
  const config = fiscalConfigFromRows(rows);
  return { ...config, ...fiscalReadiness(config), revision: fiscalSettingsRevision(config) };
}
const settingError = (message, status = 400, issues) => Object.assign(new Error(message), { status, issues });
export async function lastIssuedNumber(db, serie) {
  if (!serie) return 0;
  const rows = await db.documentoFiscal.findMany({ where: { serie, correlativo: { not: null } }, select: { correlativo: true } });
  return rows.reduce((max, row) => Math.max(max, fiscalBound(row.correlativo, serie) || 0), 0);
}
export async function saveFiscalSettings(db, body, actor) {
  const parsed = parseFiscalSettings(body);
  if (parsed.errors.length) throw settingError("Revisa los datos fiscales antes de guardar.", 400, parsed.errors);
  return db.$transaction(async tx => {
    // La misma exclusión que la emisión: ni escrituras parciales ni cambio de
    // CAI/serie mientras otra transacción reserva su siguiente número.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fiscal-correlativo'))`;
    const current = await loadFiscalSettings(tx);
    if (typeof body?.revision !== "string" || body.revision !== current.revision) throw settingError("La configuración o el correlativo cambiaron. Actualiza los datos fiscales antes de guardar para no sobrescribir otra emisión.", 409);
    const changed = FISCAL_FIELDS.filter(field => String(current[field] ?? "") !== String(parsed.values[field]));
    if (!changed.length) return current;
    if (body?.confirmado !== true) throw settingError("Confirma que revisaste los datos empresariales y la autorización real antes de guardar.");
    if (parsed.configured) {
      const issued = await lastIssuedNumber(tx, parsed.values.serie);
      const sameSeries = parsed.values.serie === current.serie;
      const minimum = Math.max(issued + 1, sameSeries ? Number(current.correlativo) || 1 : 1);
      if (Number(parsed.values.correlativo) < minimum) throw settingError(`No se puede reducir ni reutilizar la numeración. El siguiente correlativo de esta serie debe ser al menos ${minimum}.`, 409);
      if (parsed.values.cai !== current.cai && issued > 0 && fiscalBound(parsed.values.rangoInicio, parsed.values.serie) <= issued) throw settingError("El nuevo CAI no puede reutilizar un rango ya emitido de esta serie.", 409);
    } else if (current.serie && await lastIssuedNumber(tx, current.serie)) {
      throw settingError("Ya hay documentos numerados. No borres su autorización: registra un nuevo rango para las próximas emisiones.", 409);
    }
    for (const field of FISCAL_FIELDS) await tx.configuracionSistema.upsert({
      where: { clave: `fiscal.${field}` }, create: { clave: `fiscal.${field}`, valor: parsed.values[field] }, update: { valor: parsed.values[field] },
    });
    await tx.log.create({ data: { categoria: "panel", nivel: "warn", mensaje: "Configuración fiscal actualizada desde Ajustes", actor, ruta: "/api/facturacion/config", detalle: JSON.stringify({ campos: changed, serie: parsed.values.serie || null, correlativo: parsed.values.correlativo || null }) } });
    return loadFiscalSettings(tx);
  }, { timeout: 20000, isolationLevel: "ReadCommitted" });
}
