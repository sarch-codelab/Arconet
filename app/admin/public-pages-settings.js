"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import admin from "./admin-experience.module.css";
import styles from "./public-pages-settings.module.css";

export default function PublicPagesSettings({ session }) {
  const canWrite = session?.permisos?.includes("ajustes:read") && session?.permisos?.includes("ajustes:write");
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch("/api/configuracion/paginas", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.pages) throw new Error(data.error || "No se pudo cargar la disponibilidad de páginas.");
      if (active) setPages(data.pages);
    }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function changePage(page) {
    if (!canWrite || saving || !pages) return;
    const enabled = !pages[page.id];
    if (!enabled && !window.confirm(`¿Desactivar ${page.name}? Los visitantes verán un aviso temporal${page.nested ? ", también en sus páginas internas" : ""}.`)) return;
    setSaving(page.id);
    setError("");
    setFeedback("");
    try {
      const response = await apiFetch("/api/configuracion/paginas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: page.id, enabled }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la página.");
      setPages((prev) => ({ ...prev, [page.id]: data.enabled }));
      setFeedback(`${page.name} ${data.enabled ? "activada" : "desactivada"}. El cambio puede tardar unos segundos en verse.`);
    } catch (err) { setError(err.message); }
    finally { setSaving(null); }
  }

  return (
    <section className={admin.card} aria-labelledby="public-pages-title">
      <header className={admin.cardHeader}><h3 id="public-pages-title"><Globe size={18} /> Páginas del sitio público</h3></header>
      <div className={styles.content}>
        <p className={styles.description}>Activa o desactiva cada página. Al desactivarla, los visitantes verán un aviso temporal. Catálogo y Tienda incluyen sus páginas internas.</p>
        <p className={styles.note}>Inicio, acceso de clientes, panel administrativo y API permanecen disponibles. Desactivar una página no borra sus datos ni restringe las API.</p>
        {!canWrite && <p className={styles.note}>Solo lectura. Se necesita permiso de escritura de Ajustes para cambiar páginas.</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {feedback && <p role="status" className={styles.feedback}>{feedback}</p>}
        {loading ? <p className={styles.note}>Cargando páginas…</p> : !pages ? (
          <button type="button" className={admin.ghostBtn} onClick={() => { setError(""); setLoading(true); setReload((value) => value + 1); }}>Reintentar</button>
        ) : (
          <div className={styles.list}>
            {PUBLIC_PAGES.map((page) => (
              <div className={styles.row} key={page.id}>
                <div className={styles.info}>
                  <div className={styles.title}><strong>{page.name}</strong><span className={pages[page.id] ? styles.active : styles.inactive}>{pages[page.id] ? "Activa" : "Desactivada"}</span></div>
                  <span>{page.description}</span>
                  <a href={page.path} target="_blank" rel="noopener noreferrer">{page.path} ↗</a>
                </div>
                <button type="button" role="switch" aria-checked={Boolean(pages[page.id])} aria-label={`${page.name}: ${pages[page.id] ? "activa" : "desactivada"}`} disabled={!canWrite || Boolean(saving)} onClick={() => changePage(page)} className={styles.toggle}>
                  <span aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
