"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import styles from "./admin-experience.module.css";
export default function InventorySummary() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loadedFor, setLoadedFor] = useState(null);
  const loading = loadedFor !== refresh;
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/inventario/resumen", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo cargar.");
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedFor(refresh);
      });
    return () => controller.abort();
  }, [refresh]);
  return (
    <section aria-label="Resumen de Inventario">
      <header className={styles.cardHeader}>
        <h2>Mi área · Inventario</h2>
        <button
          type="button"
          className={styles.ghostBtn}
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Actualizar inventario
        </button>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      {loading && !data ? (
        <p role="status">Cargando existencias y movimientos…</p>
      ) : null}
      {data ? (
        <>
          <div className={styles.statsGrid}>
            {[
              ["Productos activos", data.productos],
              ["Sin existencias", data.agotados],
              ["Bajo mínimo", data.bajoMinimo],
              ["Bodegas activas", data.bodegas],
              ...(data.recepcionesPendientes != null
                ? [["Recepciones pendientes", data.recepcionesPendientes]]
                : []),
            ].map(([label, value]) => (
              <article key={label} className={styles.statCard}>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </article>
            ))}
          </div>
          <div className={styles.card}>
            <header className={styles.cardHeader}>
              <h3>Existencias por unidad de medida</h3>
            </header>
            <div className={styles.cardBody}>
              {Object.entries(data.unidadesPorUnidad).map(([unit, amount]) => (
                <p key={unit}>
                  <strong>{Number(amount).toLocaleString("es-HN")}</strong>{" "}
                  {unit}
                </p>
              ))}
              <small>
                No se suman metros y piezas como si fueran la misma unidad.
              </small>
            </div>
          </div>
          <div className={styles.card}>
            <header className={styles.cardHeader}>
              <h3>Últimos movimientos de mi área</h3>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Bodega</th>
                    <th>Movimiento</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((row) => (
                    <tr key={row.id}>
                      <td data-label="Fecha">
                        {new Date(row.fecha).toLocaleDateString("es-HN")}
                      </td>
                      <td data-label="Producto">{row.producto?.nombre}</td>
                      <td data-label="Bodega">{row.bodega?.nombre}</td>
                      <td data-label="Movimiento">{row.tipo}</td>
                      <td data-label="Cantidad">
                        {row.cantidad} {row.producto?.unidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.movimientos.length ? (
                <p className={styles.empty}>Todavía no hay movimientos.</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
