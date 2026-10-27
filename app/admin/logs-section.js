"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Pause, Play, RefreshCw, ScrollText, Search } from "lucide-react";
import styles from "./admin-experience.module.css";
import { formatTimestamp } from "./log-utils";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";


const LOG_LEVELS = {
  info: { label: "Info", icon: Info },
  warn: { label: "Aviso", icon: AlertTriangle },
  error: { label: "Error", icon: AlertTriangle },
};

const LOG_CATEGORY_LABELS = {
  auth: "Autenticación",
  api: "API",
  db: "Base de datos",
  sistema: "Sistema",
  panel: "Panel",
};

/** Tamano de pagina del listado de logs (Fase 2: paginacion). */
const LOG_PAGE_SIZE = 50;
/** Intervalo de auto-actualizacion cuando la pausa esta desactivada. */
const LOG_REFRESH_MS = 30_000;

export default function LogsSection({ session, workers = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [nivel, setNivel] = useState("todos");
  const [page, setPage] = useState(1);
  const [paused, setPaused] = useState(false);

  const loadLogs = useCallback(
    async (categoria = "todas", filtroNivel = "todos") => {
      try {
        const params = new URLSearchParams();
        // La API espera "todas" para no filtrar por categoria.
        const categoriaApi = categoria === "all" ? "todas" : categoria;
        if (categoriaApi !== "todas") params.set("categoria", categoriaApi);
        if (filtroNivel !== "todos") params.set("nivel", filtroNivel);
        const query = params.toString();
        const res = await fetch(`/api/logs${query ? `?${query}` : ""}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("No se pudieron obtener los logs");
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        console.error("Error al cargar los logs:", err);
        setLogs([]);
        setError("No se pudieron cargar los registros del sistema.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Al cambiar filtros se vuelve a la primera pagina.
  useEffect(() => {
    setPage(1);
  }, [tab, nivel]);

  useEffect(() => {
    setRefreshing(true);
    loadLogs(tab, nivel);
    if (paused) return () => setRefreshing(false);
    const timer = setInterval(() => loadLogs(tab, nivel), LOG_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadLogs, tab, nivel, paused]);

  const totalPages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleLogs = logs.slice((safePage - 1) * LOG_PAGE_SIZE, safePage * LOG_PAGE_SIZE);

  return (
    <>
      <Topbar
        title="Logs del sistema"
        subtitle="Registro de actividad de autenticación, API, base de datos y panel."
        action={
          <div className={styles.logsActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setPaused((prev) => !prev)}
              aria-pressed={paused}
              title={paused ? "Reanudar actualizacion automatica" : "Pausar actualizacion automatica"}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
              {paused ? "Reanudar" : "Pausar"}
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => {
                setRefreshing(true);
                loadLogs(tab, nivel);
              }}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? styles.spinning : undefined} />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.logs?.tabs}
          activeTab={tab}
          onTabChange={setTab}
          label="Filtros de registros"
        />

        <section className={styles.card} aria-label="Filtros de los registros">
          <header className={styles.cardHeader}>
            <h3>
              <ScrollText size={18} /> Filtros
            </h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.toolbar}>
              <label className={styles.fieldInline}>
                Nivel
                <select
                  value={nivel}
                  onChange={(event) => setNivel(event.target.value)}
                  className={styles.select}
                >
                  <option value="todos">Todos</option>
                  <option value="info">Info</option>
                  <option value="warn">Aviso</option>
                  <option value="error">Error</option>
                </select>
              </label>
              <span className={styles.logsCount}>
                {loading
                  ? "Cargando registros..."
                  : `${logs.length} registro${logs.length === 1 ? "" : "s"}${paused ? " · auto-refresh en pausa" : ""}`}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-label="Registros del sistema">
          <header className={styles.cardHeader}>
            <h3>
              <ScrollText size={18} /> Actividad registrada
            </h3>
          </header>
          <div className={styles.cardBody}>
            {loading ? (
              <p className={styles.emptyText}>Cargando registros...</p>
            ) : error ? (
              <p className={styles.emptyText}>{error}</p>
            ) : logs.length === 0 ? (
              <p className={styles.emptyText}>
                No hay registros para los filtros seleccionados.
              </p>
            ) : (
              <>
                <ul className={styles.logsList}>
                  {visibleLogs.map((log) => {
                    const level = LOG_LEVELS[log.nivel] || LOG_LEVELS.info;
                    const LevelIcon = level.icon;
                    return (
                      <li key={log.id} className={styles.logItem}>
                        <div className={styles.logHeader}>
                          <span
                            className={`${styles.logLevel} ${styles[`logLevel_${log.nivel}`] || ""}`}
                          >
                            <LevelIcon size={12} />
                            {level.label}
                          </span>
                          <span className={styles.logCategory}>
                            {LOG_CATEGORY_LABELS[log.categoria] || log.categoria}
                          </span>
                          <span className={styles.logTime}>
                            {formatTimestamp(log.createdAt)}
                          </span>
                        </div>
                        <p className={styles.logMessage}>{log.mensaje}</p>
                        {(log.actor || log.ruta) && (
                          <small className={styles.logActor}>
                            {log.actor ? `Por: ${log.actor}` : ""}
                            {log.actor && log.ruta ? " · " : ""}
                            {log.ruta || ""}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {totalPages > 1 && (
                  <nav className={styles.pagination} aria-label="Paginacion de registros">
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage <= 1}
                    >
                      <ArrowLeft size={15} /> Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Pagina {safePage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Siguiente <ArrowRight size={15} />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
