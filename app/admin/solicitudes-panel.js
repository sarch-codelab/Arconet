"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, ClipboardList, MessageSquare, Plus, Send } from "lucide-react";
import { sileo } from "../toaster";
import { Topbar } from "./topbar";
import styles from "./solicitudes-panel.module.css";

const AREA_LABELS = { bodega: "Bodega", mantenimiento: "Mantenimiento", atencion: "Atención al cliente" };
const STATUS_LABELS = { pendiente: "Pendiente", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada", en_proceso: "En proceso", completada: "Completada" };
const PRIORITY_LABELS = { baja: "Baja", normal: "Normal", alta: "Alta", urgente: "Urgente" };
const FILTERS = ["todas", "pendiente", "en_revision", "aprobada", "en_proceso", "completada", "rechazada"];

async function request(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

export default function SolicitudesPanel({ session }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [draft, setDraft] = useState({ titulo: "", descripcion: "", area: "bodega", prioridad: "normal" });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await request("/api/solicitudes");
      setItems(Array.isArray(data) ? data : []);
      setLoadError("");
      setSelectedId((current) => current && data.some((item) => item.id === current) ? current : data[0]?.id || "");
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-HN");
    return items.filter((item) => {
      if (filter !== "todas" && item.estado !== filter) return false;
      return !q || `${item.id} ${item.titulo} ${item.descripcion} ${item.solicitanteNombre} ${AREA_LABELS[item.area]}`.toLocaleLowerCase("es-HN").includes(q);
    });
  }, [items, filter, query]);

  const create = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = await request("/api/solicitudes", { method: "POST", body: JSON.stringify(draft) });
      setItems((current) => [saved, ...current]);
      setSelectedId(saved.id);
      setShowCreate(false);
      setDraft({ titulo: "", descripcion: "", area: "bodega", prioridad: "normal" });
      sileo.success({ title: "Orden enviada", description: `La solicitud llegó al equipo de ${AREA_LABELS[saved.area]}.` });
    } catch (error) {
      sileo.error({ title: "No se pudo enviar la orden", description: error.message });
    } finally { setSaving(false); }
  };

  const updateStatus = async (estado) => {
    if (!selected) return;
    setSaving(true);
    try {
      const saved = await request(`/api/solicitudes/${encodeURIComponent(selected.id)}`, { method: "PATCH", body: JSON.stringify({ estado }) });
      setItems((current) => current.map((item) => item.id === saved.id ? saved : item));
      sileo.success({ title: "Estado actualizado", description: `La orden ahora está ${STATUS_LABELS[estado].toLocaleLowerCase("es-HN")}.` });
    } catch (error) {
      sileo.error({ title: "No se pudo actualizar", description: error.message });
    } finally { setSaving(false); }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    if (!selected || !comment.trim() || saving) return;
    setSaving(true);
    try {
      const saved = await request(`/api/solicitudes/${encodeURIComponent(selected.id)}/comentarios`, { method: "POST", body: JSON.stringify({ mensaje: comment }) });
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, comentarios: [...(item.comentarios || []), saved] } : item));
      setComment("");
    } catch (error) {
      sileo.error({ title: "No se pudo enviar el comentario", description: error.message });
    } finally { setSaving(false); }
  };

  const canProcess = ["administrador", "gerente", ...(selected?.area === "bodega" ? ["bodega"] : selected?.area === "mantenimiento" ? ["mantenimiento", "tecnico"] : selected?.area === "atencion" ? ["ventas"] : [])].includes(session?.rol);
  const actions = selected ? ({
    pendiente: [["en_revision", "Iniciar revisión"]],
    en_revision: [["aprobada", "Aprobar"], ["rechazada", "Rechazar"]],
    aprobada: [["en_proceso", "Iniciar trabajo"]],
    en_proceso: [["completada", "Marcar completada"]],
  }[selected.estado] || []) : [];

  return (
    <>
      <Topbar title="Órdenes internas" subtitle="Solicitudes entre atención, bodega y mantenimiento, con seguimiento compartido." session={session} action={<button type="button" className={styles.createButton} onClick={() => setShowCreate((value) => !value)}><Plus size={16} /> Nueva orden</button>} />
      <main className={styles.page}>
        <header className={styles.heading}>
          <div><span className={styles.eyebrow}><ClipboardList size={14} /> Flujo de trabajo</span><h2>Solicitudes del equipo</h2><p>Las órdenes se envían al área responsable. El solicitante recibe comentarios y cambios de estado.</p></div>
          <div className={styles.summary}><strong>{items.filter((item) => !["completada", "rechazada"].includes(item.estado)).length}</strong><span>abiertas en tu bandeja</span></div>
        </header>

        {showCreate && <form className={styles.createForm} onSubmit={create}>
          <div className={styles.formHeader}><div><strong>Nueva orden de trabajo</strong><p>Describe qué necesitas y selecciona quién debe atenderlo.</p></div><button type="button" className={styles.closeButton} onClick={() => setShowCreate(false)} aria-label="Cerrar">×</button></div>
          <div className={styles.formGrid}>
            <label>Asunto<input required maxLength={140} value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} placeholder="Ej. Preparar 12 bobinas para el proyecto Norte" /></label>
            <label>Área responsable<select value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}><option value="bodega">Bodega · producto y preparación</option><option value="mantenimiento">Mantenimiento · reparación e inspección</option><option value="atencion">Atención al cliente · seguimiento comercial</option></select></label>
            <label>Prioridad<select value={draft.prioridad} onChange={(event) => setDraft({ ...draft, prioridad: event.target.value })}><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
            <label className={styles.fullWidth}>Detalle<textarea required maxLength={4000} rows={4} value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} placeholder="Indica cantidades, equipo, ubicación, cliente relacionado y cualquier detalle útil." /></label>
          </div>
          <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowCreate(false)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Send size={15} /> {saving ? "Enviando…" : "Enviar orden"}</button></div>
        </form>}

        {loadError && <div className={styles.error} role="alert"><AlertCircle size={17} />{loadError}<button type="button" onClick={() => load()}>Reintentar</button></div>}
        <div className={styles.filters}>
          <label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órdenes…" aria-label="Buscar órdenes internas" /></label>
          <div className={styles.filterScroll} aria-label="Filtrar por estado">{FILTERS.map((id) => <button key={id} type="button" className={filter === id ? styles.filterActive : ""} onClick={() => setFilter(id)}>{id === "todas" ? "Todas" : STATUS_LABELS[id]}</button>)}</div>
        </div>
        <div className={styles.workspace}>
          <section className={styles.list} aria-label="Órdenes">
            {loading ? <p className={styles.empty}>Cargando órdenes de la base de datos…</p> : filtered.length ? filtered.map((item) => <button type="button" key={item.id} className={`${styles.requestCard} ${item.id === selectedId ? styles.selectedCard : ""}`} onClick={() => setSelectedId(item.id)}>
              <span className={styles.cardTop}><span className={`${styles.status} ${styles[`status_${item.estado}`]}`}>{STATUS_LABELS[item.estado] || item.estado}</span><span className={`${styles.priority} ${styles[`priority_${item.prioridad}`]}`}>{PRIORITY_LABELS[item.prioridad] || item.prioridad}</span></span>
              <strong>{item.titulo}</strong><span className={styles.cardArea}>{AREA_LABELS[item.area]} · {item.id}</span><span className={styles.cardBottom}><span>{item.solicitanteNombre}</span><span><MessageSquare size={13} /> {item.comentarios?.length || 0}</span></span>
            </button>) : <div className={styles.empty}><ClipboardList size={22} /><strong>No hay órdenes para mostrar</strong><span>Las solicitudes aparecerán aquí cuando el equipo las registre.</span></div>}
          </section>

          <section className={styles.detail} aria-label="Detalle de la orden">
            {!selected ? <div className={styles.empty}><ArrowRight size={20} /><span>Selecciona una orden para revisar el detalle y conversar con el área responsable.</span></div> : <>
              <div className={styles.detailHead}><span className={styles.eyebrow}>{AREA_LABELS[selected.area]} · {selected.id}</span><h3>{selected.titulo}</h3><span className={`${styles.status} ${styles[`status_${selected.estado}`]}`}>{STATUS_LABELS[selected.estado]}</span><p>{selected.descripcion}</p><div className={styles.meta}><span>Solicitó <strong>{selected.solicitanteNombre}</strong></span><span>Prioridad <strong>{PRIORITY_LABELS[selected.prioridad]}</strong></span><span>Actualizada <strong>{new Date(selected.updatedAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })}</strong></span>{selected.responsableCorreo && <span>Responsable <strong>{selected.responsableCorreo}</strong></span>}</div></div>
              {canProcess && actions.length > 0 && <div className={styles.actions}>{actions.map(([estado, label]) => <button key={estado} type="button" className={estado === "rechazada" ? styles.rejectButton : styles.primaryButton} disabled={saving} onClick={() => updateStatus(estado)}>{estado === "aprobada" || estado === "completada" ? <Check size={15} /> : <ArrowRight size={15} />}{label}</button>)}</div>}
              <div className={styles.thread}><h4>Comentarios y seguimiento</h4><div className={styles.messages}>{selected.comentarios?.length ? selected.comentarios.map((entry) => <article key={entry.id} className={styles.message}><div><strong>{entry.autorNombre}</strong><span>{entry.autorRol}</span><time>{new Date(entry.createdAt).toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" })}</time></div><p>{entry.mensaje}</p></article>) : <p className={styles.noMessages}>Aún no hay comentarios. Usa este espacio para aclarar o actualizar la solicitud.</p>}</div><form className={styles.commentForm} onSubmit={sendComment}><textarea rows={3} maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe una actualización o pregunta para el equipo…" aria-label="Nuevo comentario" required /><button type="submit" className={styles.primaryButton} disabled={saving || !comment.trim()}><Send size={15} /> Enviar comentario</button></form></div>
            </>}
          </section>
        </div>
      </main>
    </>
  );
}
