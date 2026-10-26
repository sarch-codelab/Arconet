"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, ClipboardList, MessageSquare, Plus, Send, Settings2, X } from "lucide-react";
import { sileo } from "../toaster";
import { SectionTabs, Topbar } from "./topbar";
import adminStyles from "./admin-experience.module.css";
import styles from "./solicitudes-panel.module.css";

const STATUS_LABELS = { pendiente: "Pendiente", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada", en_proceso: "En proceso", completada: "Completada" };
const PRIORITY_LABELS = { baja: "Baja", normal: "Normal", alta: "Alta", urgente: "Urgente" };
const FILTERS = ["todas", "pendiente", "en_revision", "aprobada", "en_proceso", "completada", "rechazada"];
const EMPTY_AREA = { nombre: "", roles: [] };

async function request(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

export default function SolicitudesPanel({ session }) {
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [areaError, setAreaError] = useState("");
  const [view, setView] = useState("ordenes");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [draft, setDraft] = useState({ titulo: "", descripcion: "", area: "", prioridad: "normal" });
  const [areaDraft, setAreaDraft] = useState(EMPTY_AREA);
  const [editingArea, setEditingArea] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const canManageAreas = ["administrador", "gerente"].includes(session?.rol);

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

  const loadAreas = useCallback(async () => {
    try {
      const [areaData, roleData] = await Promise.all([request("/api/areas-solicitudes"), canManageAreas ? request("/api/roles") : Promise.resolve([])]);
      const activeAreas = Array.isArray(areaData) ? areaData : [];
      setAreas(activeAreas);
      setRoles(Array.isArray(roleData) ? roleData.filter((role) => role.estado === "activo") : []);
      setAreaError("");
      setDraft((current) => current.area && activeAreas.some((area) => area.slug === current.area) ? current : { ...current, area: activeAreas.find((area) => area.activa)?.slug || "" });
    } catch (error) {
      setAreaError(error.message);
    }
  }, [canManageAreas]);

  useEffect(() => { load(); loadAreas(); }, [load, loadAreas]);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const activeAreas = areas.filter((area) => area.activa);
  const areaName = (slug) => areas.find((area) => area.slug === slug)?.nombre || slug;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-HN");
    return items.filter((item) => {
      if (filter !== "todas" && item.estado !== filter) return false;
      return !q || `${item.id} ${item.titulo} ${item.descripcion} ${item.solicitanteNombre} ${areaName(item.area)}`.toLocaleLowerCase("es-HN").includes(q);
    });
  }, [items, filter, query, areas]);

  const create = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = await request("/api/solicitudes", { method: "POST", body: JSON.stringify(draft) });
      setItems((current) => [saved, ...current]);
      setSelectedId(saved.id);
      setShowCreate(false);
      setDraft({ titulo: "", descripcion: "", area: activeAreas[0]?.slug || "", prioridad: "normal" });
      sileo.success({ title: "Orden enviada", description: `La solicitud llegó al equipo de ${areaName(saved.area)}.` });
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

  const removeOrder = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await request(`/api/solicitudes/${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      const rest = items.filter((item) => item.id !== selected.id);
      setItems(rest);
      setSelectedId(rest[0]?.id || "");
      setConfirmingDelete(false);
      sileo.success({ title: "Orden eliminada" });
    } catch (error) {
      sileo.error({ title: "No se pudo eliminar la orden", description: error.message });
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

  const saveArea = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = await request(editingArea ? `/api/areas-solicitudes/${encodeURIComponent(editingArea.id)}` : "/api/areas-solicitudes", {
        method: editingArea ? "PATCH" : "POST",
        body: JSON.stringify(areaDraft),
      });
      setAreas((current) => editingArea ? current.map((area) => area.id === saved.id ? saved : area) : [...current, saved].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setAreaDraft(EMPTY_AREA);
      setEditingArea(null);
      sileo.success({ title: editingArea ? "Área actualizada" : "Área creada" });
    } catch (error) {
      sileo.error({ title: "No se pudo guardar el área", description: error.message });
    } finally { setSaving(false); }
  };

  const toggleArea = async (area) => {
    setSaving(true);
    try {
      const saved = area.activa
        ? await request(`/api/areas-solicitudes/${encodeURIComponent(area.id)}`, { method: "DELETE" })
        : await request(`/api/areas-solicitudes/${encodeURIComponent(area.id)}`, { method: "PATCH", body: JSON.stringify({ activa: true }) });
      setAreas((current) => current.map((item) => item.id === saved.id ? saved : item));
      sileo.success({ title: saved.activa ? "Área reactivada" : "Área desactivada" });
    } catch (error) {
      sileo.error({ title: "No se pudo cambiar el área", description: error.message });
    } finally { setSaving(false); }
  };

  const beginEditArea = (area) => { setEditingArea(area); setAreaDraft({ nombre: area.nombre, roles: area.roles }); };
  const cancelEditArea = () => { setEditingArea(null); setAreaDraft(EMPTY_AREA); };
  const areaTabs = [
    { id: "ordenes", label: "Órdenes", icon: ClipboardList },
    ...(canManageAreas ? [{ id: "areas", label: "Áreas y responsables", icon: Settings2 }] : []),
  ];
  const canProcess = Boolean(selected && (canManageAreas || areas.find((area) => area.slug === selected.area)?.roles.includes(session?.rol)));
  const actions = selected ? ({
    pendiente: [["en_revision", "Iniciar revisión"]],
    en_revision: [["aprobada", "Aprobar"], ["rechazada", "Rechazar"]],
    aprobada: [["en_proceso", "Iniciar trabajo"]],
    en_proceso: [["completada", "Marcar completada"]],
  }[selected.estado] || []) : [];

  return (
    <>
      <Topbar title="Órdenes internas" subtitle="Solicitudes de trabajo con responsables, aprobaciones y seguimiento compartido." session={session} action={view === "ordenes" ? <button type="button" className={adminStyles.primaryBtn} onClick={() => setShowCreate((value) => !value)}><Plus size={16} /> Nueva orden</button> : null} />
      <div className={adminStyles.body}>
        <SectionTabs tabs={areaTabs} activeTab={view} onTabChange={setView} label="Órdenes y configuración de áreas" />

        {view === "areas" && canManageAreas ? <>
          <header className={styles.heading}><div><span className={styles.eyebrow}><Settings2 size={14} /> Administración</span><h2>Áreas responsables</h2><p>Configura las áreas disponibles y los roles que reciben sus órdenes.</p></div></header>
          {areaError && <div className={styles.error} role="alert"><AlertCircle size={17} />{areaError}<button type="button" onClick={loadAreas}>Reintentar</button></div>}
          <section className={styles.areaLayout}>
            <form className={styles.createForm} onSubmit={saveArea}>
              <div className={styles.formHeader}><div><strong>{editingArea ? "Editar área" : "Agregar área"}</strong><p>El nombre y los roles quedan disponibles inmediatamente.</p></div>{editingArea && <button type="button" className={styles.closeButton} onClick={cancelEditArea} aria-label="Cancelar edición"><X size={17} /></button>}</div>
              <div className={styles.areaFormFields}>
                <label>Nombre del área<input required minLength={2} maxLength={80} value={areaDraft.nombre} onChange={(event) => setAreaDraft((current) => ({ ...current, nombre: event.target.value }))} placeholder="Ej. Compras" /></label>
                <fieldset className={styles.roleFieldset}><legend>Roles que atienden esta área</legend>{roles.length ? roles.map((role) => <label key={role.slug} className={styles.roleOption}><input type="checkbox" checked={areaDraft.roles.includes(role.slug)} onChange={(event) => setAreaDraft((current) => ({ ...current, roles: event.target.checked ? [...current.roles, role.slug] : current.roles.filter((slug) => slug !== role.slug) }))} /><span>{role.nombre}</span><small>{role.slug}</small></label>) : <p>No hay roles activos para asignar.</p>}</fieldset>
              </div>
              <div className={styles.formActions}>{editingArea && <button type="button" className={adminStyles.ghostBtn} onClick={cancelEditArea}>Cancelar</button>}<button type="submit" className={adminStyles.primaryBtn} disabled={saving || !areaDraft.roles.length}><Check size={15} /> {saving ? "Guardando…" : editingArea ? "Guardar cambios" : "Crear área"}</button></div>
            </form>
            <section className={styles.areaList} aria-label="Áreas configuradas">
              {areas.length ? areas.map((area) => <article className={styles.areaCard} key={area.id}>
                <div className={styles.areaCardHead}><div><h3>{area.nombre}</h3><code>{area.slug}</code></div><span className={`${styles.areaState} ${area.activa ? styles.areaStateActive : ""}`}>{area.activa ? "Activa" : "Inactiva"}</span></div>
                <p>Roles responsables: {area.roles.map((slug) => roles.find((role) => role.slug === slug)?.nombre || slug).join(", ") || "Sin asignar"}</p>
                <div className={styles.areaActions}><button type="button" className={adminStyles.ghostBtn} onClick={() => beginEditArea(area)}><Settings2 size={14} /> Editar</button><button type="button" className={area.activa ? styles.deactivateButton : adminStyles.ghostBtn} disabled={saving} onClick={() => toggleArea(area)}>{area.activa ? "Desactivar" : "Reactivar"}</button></div>
              </article>) : <div className={styles.empty}><Settings2 size={22} /><strong>No hay áreas configuradas</strong><span>Agrega la primera área y asígnale un rol.</span></div>}
            </section>
          </section>
        </> : <>
          <header className={styles.heading}>
            <div><span className={styles.eyebrow}><ClipboardList size={14} /> Flujo de trabajo</span><h2>Solicitudes del equipo</h2><p>Las órdenes se envían al área responsable. El solicitante recibe comentarios y cambios de estado.</p></div>
            <div className={styles.summary}><strong>{items.filter((item) => !["completada", "rechazada"].includes(item.estado)).length}</strong><span>abiertas en tu bandeja</span></div>
          </header>

          {showCreate && <form className={styles.createForm} onSubmit={create}>
            <div className={styles.formHeader}><div><strong>Nueva orden de trabajo</strong><p>Describe qué necesitas y selecciona quién debe atenderlo.</p></div><button type="button" className={styles.closeButton} onClick={() => setShowCreate(false)} aria-label="Cerrar"><X size={17} /></button></div>
            <div className={styles.formGrid}>
              <label>Asunto<input required maxLength={140} value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} placeholder="Ej. Preparar materiales para un proyecto" /></label>
              <label>Área responsable<select required value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}><option value="" disabled>Selecciona un área</option>{activeAreas.map((area) => <option key={area.id} value={area.slug}>{area.nombre}</option>)}</select></label>
              <label>Prioridad<select value={draft.prioridad} onChange={(event) => setDraft({ ...draft, prioridad: event.target.value })}><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
              <label className={styles.fullWidth}>Detalle<textarea required maxLength={4000} rows={4} value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} placeholder="Indica cantidades, equipo, ubicación, cliente relacionado y cualquier detalle útil." /></label>
            </div>
            {!activeAreas.length && <p className={styles.formHint}>No hay áreas activas configuradas. Solicita a administración que agregue una.</p>}
            <div className={styles.formActions}><button type="button" className={adminStyles.ghostBtn} onClick={() => setShowCreate(false)}>Cancelar</button><button type="submit" className={adminStyles.primaryBtn} disabled={saving || !activeAreas.length}><Send size={15} /> {saving ? "Enviando…" : "Enviar orden"}</button></div>
          </form>}

          {loadError && <div className={styles.error} role="alert"><AlertCircle size={17} />{loadError}<button type="button" onClick={() => load()}>Reintentar</button></div>}
          <div className={styles.filters}>
            <label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órdenes…" aria-label="Buscar órdenes internas" /></label>
            <div className={styles.filterScroll} aria-label="Filtrar por estado">{FILTERS.map((id) => <button key={id} type="button" className={filter === id ? styles.filterActive : ""} onClick={() => setFilter(id)}>{id === "todas" ? "Todas" : STATUS_LABELS[id]}</button>)}</div>
          </div>
          <div className={styles.workspace}>
            <section className={styles.list} aria-label="Órdenes">
              {loading ? <p className={styles.empty}>Cargando órdenes de la base de datos…</p> : filtered.length ? filtered.map((item) => <button type="button" key={item.id} className={`${styles.requestCard} ${item.id === selectedId ? styles.selectedCard : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className={styles.cardTop}><span className={`${styles.status} ${styles[`status_${item.estado}`]}`}>{STATUS_LABELS[item.estado] || item.estado}</span><span className={`${styles.priority} ${styles[`priority_${item.prioridad}`]}`}>{PRIORITY_LABELS[item.prioridad] || item.prioridad}</span></span>
                <strong>{item.titulo}</strong><span className={styles.cardArea}>{areaName(item.area)} · {item.id}</span><span className={styles.cardBottom}><span>{item.solicitanteNombre}</span><span><MessageSquare size={13} /> {item.comentarios?.length || 0}</span></span>
              </button>) : <div className={styles.empty}><ClipboardList size={22} /><strong>No hay órdenes para mostrar</strong><span>Las solicitudes aparecerán aquí cuando el equipo las registre.</span></div>}
            </section>
            <section className={styles.detail} aria-label="Detalle de la orden">
              {!selected ? <div className={styles.empty}><ArrowRight size={20} /><span>Selecciona una orden para revisar el detalle y conversar con el área responsable.</span></div> : <>
                <div className={styles.detailHead}><span className={styles.eyebrow}>{areaName(selected.area)} · {selected.id}</span><h3>{selected.titulo}</h3><span className={`${styles.status} ${styles[`status_${selected.estado}`]}`}>{STATUS_LABELS[selected.estado]}</span><p>{selected.descripcion}</p><div className={styles.meta}><span>Solicitó <strong>{selected.solicitanteNombre}</strong></span><span>Prioridad <strong>{PRIORITY_LABELS[selected.prioridad]}</strong></span><span>Actualizada <strong>{new Date(selected.updatedAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })}</strong></span>{selected.responsableCorreo && <span>Responsable <strong>{selected.responsableCorreo}</strong></span>}</div></div>
                {canProcess && actions.length > 0 && <div className={styles.actions}>{actions.map(([estado, label]) => <button key={estado} type="button" className={estado === "rechazada" ? styles.rejectButton : adminStyles.primaryBtn} disabled={saving} onClick={() => updateStatus(estado)}>{estado === "aprobada" || estado === "completada" ? <Check size={15} /> : <ArrowRight size={15} />}{label}</button>)}</div>}
                <div className={styles.orderDanger}>
                  {confirmingDelete ? (
                    <>
                      <span>¿Eliminar esta orden con sus comentarios y adjuntos?</span>
                      <button type="button" className={adminStyles.dangerBtn} disabled={saving} onClick={removeOrder}>{saving ? "Eliminando…" : "Sí, eliminar"}</button>
                      <button type="button" className={adminStyles.ghostBtn} disabled={saving} onClick={() => setConfirmingDelete(false)}>Cancelar</button>
                    </>
                  ) : (
                    <button type="button" className={styles.deleteOrder} onClick={() => setConfirmingDelete(true)}>Eliminar orden</button>
                  )}
                </div>
                <div className={styles.thread}><h4>Comentarios y seguimiento</h4><div className={styles.messages}>{selected.comentarios?.length ? selected.comentarios.map((entry) => <article key={entry.id} className={styles.message}><div><strong>{entry.autorNombre}</strong><span>{entry.autorRol}</span><time>{new Date(entry.createdAt).toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" })}</time></div><p>{entry.mensaje}</p></article>) : <p className={styles.noMessages}>Aún no hay comentarios. Usa este espacio para aclarar o actualizar la solicitud.</p>}</div><form className={styles.commentForm} onSubmit={sendComment}><textarea rows={3} maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe una actualización o pregunta para el equipo…" aria-label="Nuevo comentario" required /><button type="submit" className={adminStyles.primaryBtn} disabled={saving || !comment.trim()}><Send size={15} /> Enviar comentario</button></form></div>
              </>}
            </section>
          </div>
        </>}
      </div>
    </>
  );
}
