"use client";

import { useEffect, useRef, useState } from "react";
import ReferenciaSelector from "./referencia-selector";
import { createCliente } from "./clientes-store";
import adminStyles from "./admin-experience.module.css";
import styles from "./ventas-form.module.css";

const emptyClient = () => ({ nombre: "", rtn: "", telefono: "", correo: "" });

export default function ClienteSelector({ value, fallback, onChange, onCreated, session, disabled = false, onBusyChange, onModeChange }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyClient);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const inFlight = useRef(false), alive = useRef(true), root = useRef(null), email = useRef(null);
  const canCreate = session?.permisos?.includes("clientes:write");

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; onModeChange?.(false); onBusyChange?.(false); };
  }, [onModeChange, onBusyChange]);

  function mode(open) {
    setCreating(open);
    setError("");
    onModeChange?.(open);
  }

  async function saveAndUse() {
    if (!canCreate || disabled || inFlight.current) return;
    if (draft.nombre.trim().length < 2) { setError("Escribe el nombre o razón social (al menos 2 caracteres)."); return; }
    if (!email.current?.reportValidity()) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const client = await createCliente({
        nombre: draft.nombre.trim(), rtn: draft.rtn.trim(), telefono: draft.telefono.trim(), correo: draft.correo.trim(), estado: "prospecto",
      });
      if (!alive.current) return;
      setSaved(client);
      onCreated?.(client);
      onChange(client);
      mode(false);
      setDraft(emptyClient());
      // Devuelve el foco al selector sin cerrar ni reiniciar el documento.
      queueMicrotask(() => root.current?.querySelector('[role="combobox"]')?.focus());
    } catch (err) {
      if (alive.current) setError(err.message || "No se pudo guardar el cliente. Tus datos siguen aquí.");
    } finally {
      inFlight.current = false;
      if (alive.current) { setBusy(false); onBusyChange?.(false); }
    }
  }

  return (
    <div className={styles.clientPicker} ref={root}>
      <ReferenciaSelector
        kind="clientes"
        value={value}
        fallback={saved?.id === value ? saved : fallback}
        disabled={disabled || busy || creating}
        onChange={onChange}
        onCreate={canCreate && !creating ? term => {
          // Un número buscado nunca se inventa como identificación del alta.
          setDraft(previous => ({ ...previous, nombre: previous.nombre || (/\p{L}/u.test(term) ? term.trim() : "") }));
          mode(true);
        } : undefined}
      />
      {creating && <section className={styles.quickForm} aria-label="Alta rápida de cliente" onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" && event.target.tagName === "INPUT") { event.preventDefault(); event.stopPropagation(); saveAndUse(); }
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!busy) mode(false); }
      }}>
        <h3>Cliente eventual / nuevo</h3>
        <p className={styles.hint}>Solo el nombre es obligatorio. Usa la identificación real si la tienes; puedes dejarla vacía. Se guardará como prospecto y quedará seleccionado.</p>
        <div className={styles.quickGrid}>
          <label className={styles.quickField}>Nombre o razón social
            <input autoFocus maxLength={1000} value={draft.nombre} disabled={busy} onChange={event => setDraft(previous => ({ ...previous, nombre: event.target.value }))} />
          </label>
          <label className={styles.quickField}>Identificación / RTN (opcional)
            <input maxLength={1000} value={draft.rtn} disabled={busy} onChange={event => setDraft(previous => ({ ...previous, rtn: event.target.value }))} />
          </label>
          <label className={styles.quickField}>Teléfono (opcional)
            <input type="tel" maxLength={1000} value={draft.telefono} disabled={busy} onChange={event => setDraft(previous => ({ ...previous, telefono: event.target.value }))} />
          </label>
          <label className={styles.quickField}>Correo (opcional)
            <input ref={email} type="email" maxLength={1000} value={draft.correo} disabled={busy} onChange={event => setDraft(previous => ({ ...previous, correo: event.target.value }))} />
          </label>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={adminStyles.primaryBtn} disabled={busy || disabled} onClick={saveAndUse}>{busy ? "Guardando cliente…" : "Guardar y usar cliente"}</button>
          <button type="button" className={adminStyles.ghostBtn} disabled={busy} onClick={() => mode(false)}>Volver a buscar</button>
        </div>
        <p className={styles.hint}>Guardar el cliente no guarda ni borra las líneas, fecha o notas del documento.</p>
      </section>}
      {!canCreate && <small className={styles.hint}>Sin permiso para crear clientes. Puedes buscar y usar uno existente.</small>}
    </div>
  );
}
