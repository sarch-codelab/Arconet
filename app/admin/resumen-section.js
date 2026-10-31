"use client";

import { useContext, useEffect, useState } from "react";
import { ArrowRight, AlertTriangle, BarChart3, Boxes, FileText, LayoutDashboard, Package, RefreshCw, ShieldCheck, ShoppingBag, Users, Warehouse } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { canReadScopedSummary } from "@/lib/permisos";
import { formatSummaryMoney, summaryTargetUrl } from "@/lib/summary-policy";
import { formatCalendarOrInstant } from "@/lib/calendar-date";
import { AdminContext } from "./admin-nav";
import { SectionTabs, Topbar } from "./topbar";
import InventorySummary from "./inventory-summary";
import styles from "./admin-experience.module.css";
import summary from "./resumen-section.module.css";

const ICONS = { ventas: BarChart3, clientes: Users, catalogo: Package, compras: ShoppingBag, solicitudes: FileText, personal: Users, sucursales: Warehouse, administracion: ShieldCheck, inventario: Boxes };
function AreaLink({ target, children, onNavigate, className, label }) {
  return <a href={summaryTargetUrl(target)} aria-label={label} data-no-transition={onNavigate ? "true" : undefined} className={className} onClick={event => {
    if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault(); onNavigate(target);
    }
  }}>{children}<ArrowRight size={15} aria-hidden="true" /></a>;
}

export function SummaryContent({ data, activeTab = "all", onTabChange, onNavigate, refreshKey = 0 }) {
  const groups = [...data.groups];
  if (data.inventory) {
    const index = groups.findIndex(group => !["ventas", "clientes", "catalogo"].includes(group.id));
    groups.splice(index < 0 ? groups.length : index, 0, { id: "inventario", title: "Inventario" });
  }
  const selected = groups.some(group => group.id === activeTab) ? activeTab : "all";
  const tabs = [{ id: "all", label: "Todo", icon: LayoutDashboard }, ...groups.map(group => ({ id: group.id, label: group.title, icon: ICONS[group.id] || LayoutDashboard }))];
  return <>
    <div className={summary.meta}>
      <p>Datos acumulados de las áreas que puedes consultar.</p>
      <p role="status">Actualizado: {new Date(data.generatedAt).toLocaleString("es-HN")}</p>
    </div>
    {groups.length > 1 && <SectionTabs tabs={tabs} activeTab={selected} onTabChange={onTabChange} label="Secciones del resumen" />}
    {!groups.length && <section className={`${styles.card} ${summary.empty}`} aria-label="Resumen disponible">
      <LayoutDashboard size={28} />
      <h2>Tus accesos, en un solo lugar</h2>
      <p>Esta cuenta no tiene áreas con indicadores asignados. Puedes abrir los accesos disponibles o consultar tu perfil.</p>
    </section>}
    {groups.filter(group => selected === "all" || selected === group.id).map(group => group.id === "inventario"
      ? <div className={summary.inventory} key={`inventory-${refreshKey}`}><InventorySummary /></div>
      : <section className={summary.group} key={group.id} aria-label={group.title}>
        <header className={summary.groupHeader}>
          <h2>{group.title}</h2>
          <AreaLink target={group.target} label={`Abrir ${group.title}`} onNavigate={onNavigate}>Abrir área</AreaLink>
        </header>
        <div className={summary.metrics}>
          {group.cards.map(card => {
            const Icon = ICONS[group.id] || LayoutDashboard;
            return <article key={card.id} data-summary-card={card.id} className={`${summary.metric} ${card.format === "money" ? summary.moneyMetric : ""} ${card.tone === "warning" ? summary.warning : ""}`}>
              <span className={styles.statIcon}><Icon size={18} aria-hidden="true" /></span>
              <span className={summary.metricLabel}>{card.label}</span>
              <strong className={summary.metricValue}>{card.format === "money" ? formatSummaryMoney(card.value, card.currency) : Number(card.value).toLocaleString("es-HN")}</strong>
              <p>{card.detail}</p>
            </article>;
          })}
        </div>
        {group.id === "personal" && data.recentWorkers?.length > 0 && <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Incorporaciones recientes de personal</h3></header>
          <div className={styles.cardBody}><ul className={summary.list}>{data.recentWorkers.map(worker => <li key={worker.id}><div><strong>{worker.nombre}</strong><span>{worker.puesto || "Puesto no registrado"}</span></div><time dateTime={worker.ingreso}>{formatCalendarOrInstant(worker.ingreso)}</time></li>)}</ul><p className={summary.note}>Hasta cinco incorporaciones; el contador incluye todo el personal autorizado.</p></div>
        </div>}
        {group.id === "sucursales" && data.branches?.length > 0 && <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Sucursales registradas</h3></header>
          <div className={styles.cardBody}><ul className={summary.list}>{data.branches.map(branch => <li key={branch.id}><strong>{branch.nombre}</strong><span>{Object.hasOwn(branch, "workers") ? `${branch.workers} trabajadores · ` : ""}{branch.estado === "activo" ? "Activa" : "Inactiva"}</span></li>)}</ul>{data.branchCount > data.branches.length && <p className={summary.note}>Se muestran {data.branches.length} de {data.branchCount} sucursales. Abre el área para consultar las demás.</p>}</div>
        </div>}
      </section>)}
    <section className={summary.access} aria-label="Accesos de tu cuenta">
      <h2>Accesos disponibles</h2>
      <div>{data.links.map(link => <AreaLink key={link.id} target={link.target} onNavigate={onNavigate} className={summary.accessLink}>{link.label}</AreaLink>)}</div>
    </section>
  </>;
}

export default function ResumenSection({ session }) {
  const context = useContext(AdminContext);
  const [refresh, setRefresh] = useState(0), [state, setState] = useState(null), [activeTab, setActiveTab] = useState("all");
  const allowed = canReadScopedSummary(session?.permisos);
  const permissionsKey = Array.isArray(session?.permisos) ? session.permisos.join("|") : "";
  const key = `${session?.id || session?.correo || ""}:${permissionsKey}:${refresh}`;
  const current = state?.key === key ? state : null;
  const loading = allowed && !current;
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    apiFetch("/api/resumen", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el resumen.");
        if (!Array.isArray(data.groups) || !Array.isArray(data.links) || typeof data.inventory !== "boolean") throw new Error("El resumen recibido no es válido.");
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message || "No se pudo cargar el resumen." }); });
    return () => controller.abort();
  }, [key, allowed]);
  return <>
    <Topbar title="Resumen" subtitle="Tu operación, según los permisos efectivos de tu cuenta." session={session}
      action={<button type="button" className={styles.ghostBtn} disabled={loading || !allowed} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />{loading ? "Actualizando…" : "Actualizar resumen"}</button>} />
    <div className={`${styles.body} ${summary.body}`} aria-busy={loading}>
      {loading && <div className={summary.loading} role="status"><RefreshCw size={20} /><p>Preparando tus indicadores autorizados…</p></div>}
      {current?.error && <section className={summary.error} role="alert"><AlertTriangle size={22} /><div><h2>No se pudo actualizar el resumen</h2><p>{current.error}</p><button className={styles.ghostBtn} type="button" onClick={() => setRefresh(value => value + 1)}>Reintentar</button></div></section>}
      {current?.data && <SummaryContent data={current.data} activeTab={activeTab} onTabChange={setActiveTab} onNavigate={context?.goTo} refreshKey={key} />}
      {!allowed && <p>Sin áreas de lectura asignadas. Mi perfil sigue disponible.</p>}
    </div>
  </>;
}
