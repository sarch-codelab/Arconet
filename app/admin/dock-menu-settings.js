"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { defaultDockMenu } from "@/lib/dock-menu";
import admin from "./admin-experience.module.css";
import styles from "./dock-menu-settings.module.css";

const freshId = () => `n-${crypto.randomUUID()}`;
const getAt = (root, path) => path.reduce((value, key) => value[key], root);

function EditList({ title, entries, path, kind, change, canWrite }) {
  const isGroup = kind === "group";
  const labelKey = isGroup ? "title" : "label";
  const add = () => {
    const value = isGroup ? { id: freshId(), title: "Nuevo grupo", enabled: true, links: [] }
      : { id: freshId(), label: "Nuevo enlace", href: "/", enabled: true, ...(kind === "item" ? { groups: [] } : {}) };
    change(path, (list) => [...list, value]);
  };
  return (
    <div className={styles.list}>
      <div className={styles.listHead}><strong>{title}</strong><button type="button" disabled={!canWrite} onClick={add}>+ Añadir {isGroup ? "grupo" : "enlace"}</button></div>
      {!entries.length && <p className={styles.hint}>Sin elementos.</p>}
      {entries.map((entry, index) => {
        const entryPath = [...path, index];
        const set = (key, value) => change(entryPath, (item) => { item[key] = value; return item; });
        const move = (direction) => change(path, (list) => { const target = index + direction; [list[index], list[target]] = [list[target], list[index]]; return list; });
        return (
          <details className={styles.entry} key={entry.id} open={entry.id.startsWith("n-") || undefined}>
            <summary><strong>{entry[labelKey] || (isGroup ? "Grupo" : "Enlace")}</strong><span>{entry.enabled ? "Visible" : "Oculto"}</span></summary>
            <div className={styles.entryBody}>
              <div className={styles.fields}>
                <label>{isGroup ? "Título del grupo" : "Nombre"}<input maxLength={80} required disabled={!canWrite} value={entry[labelKey]} onChange={(event) => set(labelKey, event.target.value)} /></label>
                {!isGroup && <label>Destino<input maxLength={300} required disabled={!canWrite} value={entry.href} onChange={(event) => set("href", event.target.value)} placeholder="/tienda o #inicio" /></label>}
              </div>
              <label className={styles.checkbox}><input type="checkbox" disabled={!canWrite} checked={entry.enabled} onChange={(event) => set("enabled", event.target.checked)} /> Mostrar {isGroup ? "grupo" : "enlace"}</label>
              <div className={styles.actions}>
                <button type="button" disabled={!canWrite || index === 0} onClick={() => move(-1)} aria-label={`Subir ${entry[labelKey]}`}>↑ Subir</button>
                <button type="button" disabled={!canWrite || index === entries.length - 1} onClick={() => move(1)} aria-label={`Bajar ${entry[labelKey]}`}>↓ Bajar</button>
                <button type="button" disabled={!canWrite} className={styles.remove} onClick={() => change(path, (list) => list.filter((_, i) => i !== index))} aria-label={`Eliminar ${entry[labelKey]}`}>Eliminar</button>
              </div>
              {kind === "item" && <EditList title="Grupos desplegables" entries={entry.groups} path={[...entryPath, "groups"]} kind="group" change={change} canWrite={canWrite} />}
              {kind === "group" && <EditList title="Enlaces del grupo" entries={entry.links} path={[...entryPath, "links"]} kind="link" change={change} canWrite={canWrite} />}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default function DockMenuSettings({ session }) {
  const canWrite = session?.permisos?.includes("ajustes:read") && session?.permisos?.includes("ajustes:write");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch("/api/configuracion/menu-navegacion", { cache: "no-store" }).then(async (response) => {
      const value = await response.json().catch(() => ({}));
      if (!response.ok || !value.menu) throw new Error(value.error || "No se pudo cargar el menú.");
      if (active) { setData(value); setDirty(false); if (value.corrupt) setNotice("La configuración anterior no es válida. Se muestran los valores originales; guárdalos para restaurarla."); }
    }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  function change(path, update) {
    setData((old) => {
      const next = structuredClone(old);
      if (!path.length) next.menu = update(next.menu);
      else { const parent = getAt(next.menu, path.slice(0, -1)); const last = path[path.length - 1]; parent[last] = update(parent[last]); }
      return next;
    });
    setDirty(true); setNotice("");
  }
  async function save(event) {
    event.preventDefault();
    if (!canWrite || saving || !data) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/configuracion/menu-navegacion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menu: data.menu, revision: data.revision }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el menú.");
      setData(result); setDirty(false); setNotice("Menú guardado. Los visitantes verán los cambios al volver a cargar o abrir el sitio.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  function reload() {
    if (dirty && !window.confirm("Se descartarán los cambios sin guardar. ¿Continuar?")) return;
    setLoading(true); setError(""); setNotice(""); setRetry((n) => n + 1);
  }

  return (
    <section className={admin.card} aria-labelledby="dock-menu-settings-title">
      <header className={admin.cardHeader}><h3 id="dock-menu-settings-title"><Menu size={18} /> Menú de navegación 2</h3></header>
      <div className={styles.content}>
        <p className={styles.hint}>Edita la barra que aparece al desplazarte y su menú desplegable en escritorio y móvil. El menú inicial del hero no cambia. Los accesos a Login y Admin permanecen fijos.</p>
        <p className={styles.hint}>Los destinos pueden ser rutas del sitio (como /tienda), secciones (como #inicio) o enlaces HTTPS. Ocultar un enlace no desactiva su página.</p>
        {!canWrite && <p className={styles.hint}>Solo lectura: necesitas permiso de escritura de Ajustes para modificar el menú.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {loading ? <p className={styles.hint}>Cargando menú…</p> : !data ? <button className={admin.ghostBtn} type="button" onClick={reload}>Reintentar</button> : (
          <form onSubmit={save} noValidate>
            <EditList title="Enlaces de la barra" entries={data.menu.items} path={["items"]} kind="item" change={change} canWrite={canWrite && !saving} />
            <details className={styles.entry}>
              <summary><strong>Acceso destacado</strong><span>{data.menu.primary.enabled ? "Visible" : "Oculto"}</span></summary>
              <div className={styles.entryBody}>
                <div className={styles.fields}>
                  {[['label', 'Nombre', 80], ['description', 'Descripción', 120], ['href', 'Destino', 300]].map(([key, label, max]) => <label key={key}>{label}<input maxLength={max} required disabled={!canWrite || saving} value={data.menu.primary[key]} onChange={(event) => { const value = event.target.value; change(["primary"], (primary) => ({ ...primary, [key]: value })); }} /></label>)}
                </div>
                <label className={styles.checkbox}><input type="checkbox" disabled={!canWrite || saving} checked={data.menu.primary.enabled} onChange={(event) => { const checked = event.target.checked; change(["primary"], (primary) => ({ ...primary, enabled: checked })); }} /> Mostrar acceso destacado</label>
              </div>
            </details>
            <EditList title="Enlaces inferiores" entries={data.menu.legal} path={["legal"]} kind="link" change={change} canWrite={canWrite && !saving} />
            <div className={styles.footer}>
              <button type="submit" className={admin.submit} disabled={!canWrite || saving || !dirty}>{saving ? "Guardando…" : "Guardar menú"}</button>
              <button type="button" className={admin.ghostBtn} onClick={reload} disabled={saving}>Recargar</button>
              <button type="button" className={admin.ghostBtn} disabled={!canWrite || saving} onClick={() => { if (window.confirm("¿Restaurar el menú original? Debes guardar para aplicar el cambio.")) change([], () => defaultDockMenu()); }}>Restaurar original</button>
              {dirty && <span className={styles.hint}>Cambios sin guardar</span>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
