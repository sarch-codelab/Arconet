import { fiscalPreviewTotals, validCommercialLine, MAX_DOCUMENT_AMOUNT, roundMoney } from "./ventas-form";

// El botón puede explicar por qué no envía: no depender de un disabled sin
// motivo ni de notificaciones fuera de la capa del diálogo nativo.
export function invoiceIssues({ canEmit = true, loading = false, loadError = "", clientBusy = false, clientCreating = false, clienteId = "", lineas = [], config = null, recovering = false }) {
  const issues = [];
  if (!canEmit) return ["Tu cuenta no tiene permiso para emitir ventas fiscales."];
  if (loading) issues.push("Espera a que termine de cargar el estado fiscal.");
  if (loadError) issues.push("No se pudieron cargar los datos fiscales. Reintenta la consulta sin borrar el borrador.");
  if (clientBusy) issues.push("Espera a que termine de guardarse el cliente.");
  else if (clientCreating) issues.push("Guarda y usa el cliente nuevo, o vuelve a buscar uno existente.");
  if (!clienteId) issues.push("Selecciona un cliente del buscador; escribir su nombre no lo selecciona.");
  if (!Array.isArray(lineas) || !lineas.length) issues.push("Añade al menos un producto o un concepto / servicio.");
  else {
    if (lineas.length > 100) issues.push("El documento admite hasta 100 líneas.");
    lineas.forEach((line, index) => {
      const label = `Línea ${index + 1}`;
      if (line.kind === "producto" && !line.productoId) issues.push(`${label}: selecciona un producto del catálogo.`);
      if (!String(line.descripcion || "").trim()) issues.push(`${label}: falta la descripción.`);
      if (!validCommercialLine({ ...line, nombre: line.descripcion })) issues.push(`${label}: revisa cantidad y precio. Los productos usan cantidades enteras; los conceptos hasta 3 decimales y los precios hasta 2.`);
      const discount = line.descuento === "" || line.descuento == null ? 0 : Number(line.descuento);
      if (!Number.isFinite(discount) || discount < 0 || discount > Number(line.cantidad) * Number(line.precio) || Math.abs(discount - roundMoney(discount)) > Number.EPSILON * Math.max(1, Math.abs(discount)) * 4) issues.push(`${label}: el descuento debe tener hasta 2 decimales, no ser negativo ni superar el importe de la línea.`);
      if (line.impuestoPorcentaje == null || String(line.impuestoPorcentaje).trim() === "" || ![0, 15, 18].includes(Number(line.impuestoPorcentaje))) issues.push(`${label}: selecciona ISV 15%, ISV 18% o Exento.`);
    });
    const total = fiscalPreviewTotals(lineas).total;
    if (!Number.isFinite(total) || total > MAX_DOCUMENT_AMOUNT) issues.push("El total supera el importe máximo permitido. Reduce cantidades o precios.");
  }
  if (!recovering && config?.canIssue === false) issues.push(...(config.issues || ["Administración debe revisar la autorización fiscal en Ajustes."]));
  return [...new Set(issues)];
}


// Caché transitoria por instancia autenticada del panel. Sin storage, URL ni
// estado global compartido entre usuarios. Sólo se lee al montar el editor.
export function createFiscalDraftMemory() {
  let draft = null;
  return { read: () => draft, write: value => { draft = value; } };
}
