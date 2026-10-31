// Definiciones puras compartidas por Ajustes, validación y estado de emisión.
// Nunca incluyen credenciales del servidor.
export const FISCAL_FIELDS = ["cai", "serie", "correlativo", "rangoInicio", "rangoFin", "fechaLimite", "nit", "nombre", "direccion"];
export const FISCAL_CONFIG_KEYS = [...FISCAL_FIELDS.map(field => `fiscal.${field}`), "companyName", "email", "phone"];
export const MAX_FISCAL_NUMBER = 999999999;
export function fiscalNumber(serie, value) { return `${serie}-${String(value).padStart(9, "0")}`; }
export function fiscalBound(value, serie) {
  const text = String(value ?? "").trim();
  const number = /^\d+$/.test(text) ? Number(text) : text.startsWith(`${serie}-`) && /^\d{3}-\d{3}-\d{2}-\d{9}$/.test(text) ? Number(text.slice(-9)) : NaN;
  return Number.isSafeInteger(number) && number >= 1 && number <= MAX_FISCAL_NUMBER ? number : null;
}
export function validFiscalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function hondurasDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
}
export function fiscalConfigFromRows(rows) {
  const values = Object.fromEntries(rows.map(({ clave, valor }) => [clave, valor]));
  const result = Object.fromEntries(FISCAL_FIELDS.map(field => [field, values[`fiscal.${field}`] || ""]));
  result.correlativo = /^\d+$/.test(String(result.correlativo)) ? Number(result.correlativo) : null;
  return { ...result, companyName: values.companyName || "Arconet", email: values.email || "", phone: values.phone || "" };
}
export function parseFiscalSettings(body) {
  const errors = [], values = {};
  const limits = { cai: 80, serie: 20, rangoInicio: 30, rangoFin: 30, fechaLimite: 10, nit: 30, nombre: 160, direccion: 500 };
  for (const field of FISCAL_FIELDS) {
    const raw = body?.[field];
    if (field === "correlativo") {
      if (raw === "" || raw == null) values[field] = "";
      else if ((typeof raw === "number" || typeof raw === "string") && /^\d+$/.test(String(raw)) && Number.isSafeInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= MAX_FISCAL_NUMBER + 1) values[field] = String(Number(raw));
      else { values[field] = ""; errors.push("El próximo correlativo debe ser un entero válido, sin decimales ni notación científica."); }
    } else if (typeof raw !== "string" && raw != null) { values[field] = ""; errors.push(`El campo ${field} no es válido.`); }
    else { values[field] = String(raw || "").trim(); if (values[field].length > limits[field]) errors.push(`El campo ${field} supera la longitud permitida.`); }
  }
  const configured = ["cai", "serie", "correlativo", "rangoInicio", "rangoFin", "fechaLimite"].some(field => values[field]);
  if (configured) {
    if (!values.cai) errors.push("Falta el CAI autorizado.");
    if (!/^\d{3}-\d{3}-\d{2}$/.test(values.serie)) errors.push("La serie debe tener el formato 001-001-01.");
    if (!values.correlativo) errors.push("Falta el próximo correlativo.");
    const start = fiscalBound(values.rangoInicio, values.serie), end = fiscalBound(values.rangoFin, values.serie);
    if (start == null) errors.push("Falta un inicio de rango válido de esta serie.");
    if (end == null) errors.push("Falta un fin de rango válido de esta serie.");
    if (start != null && end != null && start > end) errors.push("El inicio del rango no puede superar su fin.");
    if (start != null && end != null && values.correlativo && (Number(values.correlativo) < start || Number(values.correlativo) > end + 1)) errors.push("El próximo correlativo debe estar dentro del rango o indicar su agotamiento (fin + 1).");
    if (!validFiscalDate(values.fechaLimite)) errors.push("Falta una fecha límite de emisión válida.");
    if (!/^\d{14}$/.test(values.nit.replace(/[\s-]/g, ""))) errors.push("El RTN real del emisor debe contener 14 dígitos.");
    if (!values.nombre) errors.push("Falta la razón social registrada del emisor.");
    if (!values.direccion) errors.push("Falta la dirección fiscal del emisor.");
    if (start != null && /^\d{3}-\d{3}-\d{2}$/.test(values.serie)) values.rangoInicio = fiscalNumber(values.serie, start);
    if (end != null && /^\d{3}-\d{3}-\d{2}$/.test(values.serie)) values.rangoFin = fiscalNumber(values.serie, end);
  }
  return { values, errors: [...new Set(errors)], configured };
}
export function fiscalReadiness(config, now = new Date()) {
  const parsed = parseFiscalSettings(config);
  if (!parsed.configured) return { state: "unconfigured", tieneRango: false, canIssue: true, pending: true, issues: ["No hay autorización fiscal configurada. Las ventas sin rango se guardan pendientes de CAI, sin número ni validez fiscal."] };
  if (parsed.errors.length) return { state: "incomplete", tieneRango: false, canIssue: false, pending: false, issues: parsed.errors };
  if (parsed.values.fechaLimite < hondurasDay(now)) return { state: "expired", tieneRango: false, canIssue: false, pending: false, issues: ["La autorización fiscal está vencida. Administración debe actualizarla en Ajustes antes de emitir."] };
  if (Number(parsed.values.correlativo) > fiscalBound(parsed.values.rangoFin, parsed.values.serie)) return { state: "exhausted", tieneRango: false, canIssue: false, pending: false, issues: ["El rango autorizado está agotado. No se puede reutilizar un correlativo; revisa la nueva autorización en Ajustes."] };
  return { state: "ready", tieneRango: true, canIssue: true, pending: false, issues: [] };
}
export function fiscalRuntimeConfig(config) {
  return fiscalReadiness(config);
}
export function fiscalIssuerSnapshot(config) {
  const values = parseFiscalSettings(config).values;
  return {
    version: 1, nombre: config.nombre || config.companyName || "Arconet", nit: config.nit || null,
    direccion: config.direccion || null, email: config.email || null, phone: config.phone || null,
    rangoInicio: values.rangoInicio || null, rangoFin: values.rangoFin || null, fechaLimite: values.fechaLimite || null,
  };
}
