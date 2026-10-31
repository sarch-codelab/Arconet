"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { FISCAL_FIELDS, fiscalReadiness, parseFiscalSettings } from "@/lib/fiscal-settings";
import BusinessNotice, { focusBusinessNotice } from "./business-notice";
import styles from "./admin-experience.module.css";
import feedback from "./business-feedback.module.css";

const fields = [
  ["nit", "RTN real del emisor", "text"], ["nombre", "Razón social registrada", "text"], ["direccion", "Dirección fiscal", "text"],
  ["cai", "CAI autorizado", "text"], ["serie", "Serie / establecimiento", "text"], ["correlativo", "Próximo correlativo", "number"],
  ["rangoInicio", "Inicio del rango autorizado", "text"], ["rangoFin", "Fin del rango autorizado", "text"], ["fechaLimite", "Fecha límite de emisión", "date"],
];
export default function FiscalSettingsPanel({ session }) {
  const canWrite = session?.permisos?.includes("ajustes:write") && session?.permisos?.includes("ajustes:read");
  const [saved, setSaved] = useState(null), [draft, setDraft] = useState(null), [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false), [confirmed, setConfirmed] = useState(false), [notice, setNotice] = useState(null);
  const inFlight = useRef(false);
  const load = useCallback(signal => apiFetch("/api/facturacion/config", { cache: "no-store", signal })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la configuración fiscal.");
      if (signal?.aborted) return;
      setSaved(data);setDraft(Object.fromEntries(FISCAL_FIELDS.map(field => [field, data[field] == null ? "" : String(data[field])])));setConfirmed(false);setNotice(null);
    })
    .catch(error => { if (!signal?.aborted) setNotice({ kind: "error", title: "No se pudo cargar", message: error.message }); })
    .finally(() => { if (!signal?.aborted) setLoading(false); }), []);
  useEffect(() => { const controller = new AbortController();load(controller.signal);return () => controller.abort(); }, [load]);
  const state = draft ? fiscalReadiness(draft) : null;
  async function save(event) {
    event.preventDefault();
    if (inFlight.current) return;
    focusBusinessNotice("fiscal-settings-feedback");
    if (!canWrite) { setNotice({ kind: "error", title: "Sin permiso para guardar", message: "La configuración empresarial requiere lectura y escritura de Ajustes." });return; }
    const parsed = parseFiscalSettings(draft);
    if (parsed.errors.length) { setNotice({ kind: "error", title: "Revisa la configuración fiscal", issues: parsed.errors });return; }
    if (!confirmed) { setNotice({ kind: "error", title: "Confirma la revisión", message: "Marca la confirmación después de verificar los datos y el rango autorizado real." });return; }
    inFlight.current = true;setSaving(true);setNotice({ kind: "pending", title: "Guardando configuración fiscal…", message: "Se comprobará la numeración antes de aplicar los cambios de forma atómica." });
    try {
      const response = await apiFetch("/api/facturacion/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, revision: saved.revision, confirmado: true }) });
      const data = await response.json();
      if (!response.ok) { const e = new Error(data.error || "No se pudo guardar.");e.issues=data.issues;throw e; }
      const changed = data.revision !== saved.revision;
      setSaved(data);setDraft(Object.fromEntries(FISCAL_FIELDS.map(field => [field, data[field] == null ? "" : String(data[field])])));setConfirmed(false);
      setNotice({ kind: "success", title: changed ? "Configuración fiscal guardada" : "No había cambios pendientes", message: data.state === "ready" ? "La autorización se utilizará en las próximas emisiones. No se reescriben documentos anteriores." : "Los datos se guardaron. Revisa el estado de autorización antes de emitir una factura válida." });
      window.dispatchEvent(new Event("arconet:company-settings-updated"));
    } catch (error) { setNotice({ kind: "error", title: "No se pudo guardar la configuración fiscal", message: error.message, issues: error.issues || [] }); }
    finally { inFlight.current=false;setSaving(false); }
  }
  return <section className={styles.card} aria-label="Configuración fiscal y CAI" id="configuracion-fiscal">
    <header className={styles.cardHeader}><h3><ShieldCheck size={18} /> Datos fiscales y autorización de la empresa</h3></header>
    <div className={`${styles.cardBody} ${feedback.settingsBody}`}>
      <p className={styles.fieldHint}>Estos datos son delicados. Transcribe la autorización real: no se generan CAI, RTN ni rangos de ejemplo. Los próximos números no se pueden reducir ni reutilizar, incluso si una factura fue anulada.</p>
      {loading && <p role="status">Cargando datos fiscales…</p>}
      {notice && <BusinessNotice id="fiscal-settings-feedback" {...notice} />}
      {!loading && <button className={styles.ghostBtn} type="button" disabled={saving} onClick={() => { setLoading(true);load(); }}><RefreshCw size={15} /> Actualizar datos fiscales</button>}
      {draft && <form className={feedback.settingsBody} noValidate onSubmit={save}>
        {state && <BusinessNotice kind={state.state === "ready" ? "success" : state.pending ? "warning" : "error"} title={state.state === "ready" ? "Autorización preparada para emitir" : state.pending ? "Sin autorización fiscal configurada" : "La autorización requiere revisión"} message={state.state === "ready" ? "El servidor volverá a validar rango, vigencia y numeración al emitir." : undefined} issues={state.issues} />}
        <fieldset className={styles.fieldGrid} disabled={saving || loading || !canWrite} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {fields.map(([field, label, type]) => <label className={styles.field} key={field}>{label}
            <input type={type} autoComplete="off" min={type === "number" ? "1" : undefined} step={type === "number" ? "1" : undefined} value={draft[field]} onChange={event => { setDraft(current => ({ ...current, [field]: event.target.value }));setConfirmed(false);setNotice(null); }} />
          </label>)}
        </fieldset>
        <p className={styles.fieldHint}>Serie: formato 001-001-01. El rango acepta el número completo de esa serie o su secuencia numérica. La fecha límite se valida según Honduras. Fin + 1 indica un rango agotado, no un número disponible.</p>
        {canWrite ? <><label className={feedback.confirm}><input type="checkbox" checked={confirmed} disabled={saving} onChange={event => setConfirmed(event.target.checked)} /><span>Confirmo que revisé los datos empresariales y la autorización real, y que los cambios aplican a próximas emisiones.</span></label>
          <div className={styles.modalActions}><button className={styles.primaryBtn} type="submit" disabled={saving || loading}>{saving ? "Guardando…" : "Guardar datos fiscales"}</button></div></>
          : <p className={styles.fieldHint}>Consulta únicamente. Sólo quien tenga escritura de Ajustes puede modificar la autorización.</p>}
      </form>}
    </div>
  </section>;
}
