"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Cpu, Database, HardDrive, RefreshCw, Server, Monitor } from "lucide-react";
import styles from "./admin-experience.module.css";
import { formatTimestamp } from "./log-utils";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MonitoreoSection({ session, workers = [] }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(data);
      setError("");
    } catch (err) {
      setError(err?.message || "No se pudo obtener el estado del sistema.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  const severity = (value) => {
    if (value >= 90) return styles.meterDanger;
    if (value >= 75) return styles.meterWarn;
    return styles.meterOk;
  };

  const meter = (value, label) => (
    <div className={styles.meterRow}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className={styles.meterTrack}>
        <span
          className={`${styles.meterFill} ${severity(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );

  return (
    <>
      <Topbar
        title="Monitoreo"
        subtitle="Estado del servidor, recursos y copias de seguridad."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.monitoreo?.tabs}
          activeTab={tab}
          onTabChange={setTab}
          label="Vistas de monitoreo"
        />

        <div className={styles.monitorBar}>
          <span className={styles.monitorHint}>
            {status?.generatedAt
              ? `Actualizado: ${formatTimestamp(status.generatedAt)}`
              : "Consultando estado…"}
          </span>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => load(false)}
            disabled={loading}
          >
            <RefreshCw size={15} /> {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {error && (
          <section className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.alertItem}>
                <span className={styles.alertBadge}>Error</span>
                <span>{error}</span>
              </div>
            </div>
          </section>
        )}

        {!status && loading && !error ? (
          <section className={styles.card}>
            <div className={styles.cardBody}>
              <p className={styles.emptyText}>Cargando estado del sistema…</p>
            </div>
          </section>
        ) : null}

        {status && tab === "alerts" && !status.alerts?.length && (
          <section className={styles.card} aria-label="Alertas del sistema">
            <p className={styles.cardBody}>No hay alertas activas.</p>
          </section>
        )}

        {status && (tab === "all" || tab === "alerts") && status.alerts?.length > 0 && (
          <section className={styles.card} aria-label="Alertas del sistema">
            <header className={styles.cardHeader}>
              <h3><AlertTriangle size={18} /> Alertas activas</h3>
            </header>
            <div className={styles.cardBody}>
              <div className={styles.alertList}>
                {(status.alerts || []).map((alert, index) => (
                  <div key={index} className={styles.alertItem}>
                    <span className={styles.alertBadge}>Aviso</span>
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {status && (tab === "all" || tab === "server") && (
          <>
            <section className={styles.stats} aria-label="Recursos del servidor">
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Cpu size={18} /></span>
                <strong className={styles.statValue}>{status.cpu?.usagePercent ?? "—"}%</strong>
                <span className={styles.statLabel}>CPU</span>
                <small>{status.cpu?.cores ?? "—"} núcleos</small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Activity size={18} /></span>
                <strong className={styles.statValue}>{status.memory?.usagePercent ?? "—"}%</strong>
                <span className={styles.statLabel}>Memoria RAM</span>
                <small>{status.memory?.usedGB ?? "—"} / {status.memory?.totalGB ?? "—"} GB</small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><HardDrive size={18} /></span>
                <strong className={styles.statValue}>
                  {status.disk?.[0]?.usagePercent != null ? `${status.disk[0].usagePercent}%` : "—"}
                </strong>
                <span className={styles.statLabel}>Disco</span>
                <small>
                  {status.disk?.[0]
                    ? `${status.disk[0].usedGB} / ${status.disk[0].totalGB} GB`
                    : "No disponible"}
                </small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Server size={18} /></span>
                <strong className={styles.statValue}>{formatUptime(status.host?.uptimeSeconds)}</strong>
                <span className={styles.statLabel}>Encendido</span>
                <small>{status.host?.hostname ?? "—"}</small>
              </article>
            </section>

            <div className={styles.grid2}>
              <section className={styles.card} aria-label="Uso de recursos">
                <header className={styles.cardHeader}>
                  <h3><Activity size={18} /> Uso de recursos</h3>
                </header>
                <div className={styles.cardBody}>
                  {meter(status.cpu?.usagePercent ?? 0, "CPU")}
                  {meter(status.memory?.usagePercent ?? 0, "Memoria RAM")}
                  {(status.disk || []).map((disk) => (
                    <div key={disk.drive}>
                      {meter(disk.usagePercent, `Disco ${disk.drive}${disk.label ? ` (${disk.label})` : ""}`)}
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card} aria-label="Detalles del proceso">
                <header className={styles.cardHeader}>
                  <h3><Server size={18} /> Proceso</h3>
                </header>
                <div className={styles.cardBody}>
                  <div className={styles.list}>
                    <div className={styles.listItem}>
                      <strong>Entorno</strong>
                      <span>{status.process?.env ?? "—"}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Node</strong>
                      <span>{status.process?.nodeVersion ?? "—"}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>PID</strong>
                      <span>{status.process?.pid ?? "—"}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Memoria del proceso</strong>
                      <span>{status.process?.rssMB ?? "—"} MB</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Uptime del proceso</strong>
                      <span>{formatUptime(status.process?.uptimeSeconds)}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Sistema</strong>
                      <span>{status.host?.platform ?? "—"} {status.host?.release ?? ""} ({status.host?.arch ?? "—"})</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>CPU</strong>
                      <span>{status.cpu?.model || "—"}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {status && (tab === "all" || tab === "backups") && (
          <section className={styles.card} aria-label="Copias de seguridad">
            <header className={styles.cardHeader}>
              <h3><Database size={18} /> Backups</h3>
            </header>
            <div className={styles.cardBody}>
              <p className={styles.monitorHint}>Directorio: {status.backups?.dir ?? "—"}</p>
              {!status.backups?.available ? (
                <p className={styles.emptyText}>
                  {status.backups?.reason === "not-configured"
                    ? "No hay un directorio de backups configurado en este entorno."
                    : "No se pudo leer el directorio de backups."}
                </p>
              ) : (status.backups?.files?.length ?? 0) === 0 ? (
                <p className={styles.emptyText}>No hay copias de seguridad en el directorio.</p>
              ) : (
                <div className={styles.list}>
                  {(status.backups?.files || []).map((file) => (
                    <div key={file.name} className={styles.listItem}>
                      <div>
                        <strong>{file.name}</strong>
                        <em>{formatTimestamp(file.modifiedAt)}</em>
                      </div>
                      <span className={styles.stockLow}>{file.sizeMB} MB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
