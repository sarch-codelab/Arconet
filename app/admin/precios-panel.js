"use client";
import { useEffect, useRef, useState } from "react";
import { History, Pencil, RefreshCw, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { PRICE_LEVELS, parsePrices, validatePriceSet } from "@/lib/precios";
import { formatPrice } from "./products-store";
import { useToast } from "./admin-ui";
import { SectionTabs } from "./topbar";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import adminStyles from "./admin-experience.module.css";
import styles from "./precios-panel.module.css";
const amount = (value) =>
  value == null ? "Sin configurar" : formatPrice(value);
async function request(path, options) {
  const response = await apiFetch(path, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
export default function PreciosPanel({ hideNavigation = false,
  products = [],
  setProducts,
  session,
  tabs,
  activeTab,
  onTabChange,
  onPriceSaved,
}) {
  const canWrite = session?.permisos?.includes("precios:write");
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({});
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const busy = useRef(false);
  const { show } = useToast();
  function close() {
    if (!busy.current) setSelected(null);
  }
  useEscapeKey(Boolean(selected), close);
  useBodyScrollLock(Boolean(selected));
  useEffect(() => {
    const onSearch = (event) => setQuery(String(event.detail || ""));
    window.addEventListener("arconet:ventas-search", onSearch);
    return () => window.removeEventListener("arconet:ventas-search", onSearch);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      request(`/api/precios?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((data) => {
          if (!Array.isArray(data))
            throw new Error("Respuesta de precios inválida.");
          setRows(data);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, refresh]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    request(`/api/precios/${encodeURIComponent(selected.id)}`, {
      signal: controller.signal,
    })
      .then((data) => setHistory(data.historial))
      .catch((err) => {
        if (err.name !== "AbortError") setHistoryError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [selected]);
  function open(product) {
    setDraft(
      Object.fromEntries(
        PRICE_LEVELS.map((level) => [level.field, product[level.field] ?? ""]),
      ),
    );
    setHistoryLoading(true);
    setHistoryError("");
    setHistory([]);
    setFormError("");
    setSelected(product);
  }
  async function save(event) {
    event.preventDefault();
    if (!canWrite || busy.current) return;
    const parsed = parsePrices(draft);
    const errors = [...parsed.errors, ...validatePriceSet(parsed.data)];
    if (errors.length) {
      setFormError(errors[0]);
      return;
    }
    busy.current = true;
    setSaving(true);
    setFormError("");
    try {
      const product = await request(
        `/api/precios/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...parsed.data,
            version: selected.preciosUpdatedAt ?? null,
          }),
        },
      );
      setRows((current) =>
        current.map((row) =>
          row.id === product.id ? { ...row, ...product } : row,
        ),
      );
      setProducts?.((current) =>
        current.map((row) =>
          row.id === product.id ? { ...row, ...product } : row,
        ),
      );
      onPriceSaved?.(product);
      show(
        "Los tres precios de venta se guardaron. Los documentos anteriores conservan sus importes.",
      );
      setSelected(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <div className={adminStyles.body}>
      {!hideNavigation && <SectionTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        label="Secciones de ventas"
      />}
      <header className={styles.header}>
        <div>
          <h1>Precios de venta</h1>
          <p>
            Tres valores por producto: normal, con descuento y mayorista. Elige
            la tarifa al cotizar, vender o facturar. No se aplican descuentos ni
            cantidades mínimas automáticamente.
          </p>
        </div>
        <button
          type="button"
          className={adminStyles.ghostBtn}
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} /> Recargar
        </button>
      </header>
      <div className={styles.notice}>
        <strong>Valor 1 no es el costo de compra.</strong> Los tres valores son
        precios de venta. Descuento y mayorista son opcionales: déjalos vacíos
        si todavía no están definidos. Para modificarlos se requiere el permiso
        «Precios y descuentos · Crear y editar».
      </div>
      <div className={styles.tools}>
        <input
          aria-label="Buscar precios por nombre o SKU"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar producto o SKU…"
        />
        <span className={styles.meta}>
          {rows.length} {rows.length === 1 ? "producto" : "productos"}
          {rows.length === 500 ? " · límite de 500, usa el buscador" : ""}
        </span>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Cargando precios…</p>}
      {!loading && !error && !rows.length && (
        <p>No hay productos para esta búsqueda.</p>
      )}
      <div className={styles.grid}>
        {rows.map((product) => (
          <article key={product.id} className={styles.card}>
            <span className={styles.meta}>
              {product.sku} · {product.estado}
            </span>
            <h2>{product.nombre}</h2>
            <span className={styles.meta}>{product.categoria}</span>
            <div className={styles.prices}>
              {PRICE_LEVELS.map((level) => (
                <div key={level.id} className={styles.price}>
                  <span>{level.label}</span>
                  <strong>{amount(product[level.field])}</strong>
                </div>
              ))}
            </div>
            {product.preciosUpdatedAt && (
              <p className={styles.meta}>
                Actualizado{" "}
                {new Date(product.preciosUpdatedAt).toLocaleString("es-HN")} por{" "}
                {product.preciosUpdatedBy || "Administración"}
              </p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={adminStyles.ghostBtn}
                onClick={() => open(product)}
              >
                {canWrite ? <Pencil size={14} /> : <History size={14} />}
                {canWrite
                  ? "Editar precios e historial"
                  : "Consultar historial"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {selected && (
        <div
          className={`${adminStyles.overlay} ${adminStyles.centeredOverlay}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={adminStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={canWrite ? "Editar precios" : "Historial de precios"}
          >
            <header className={adminStyles.modalHead}>
              <div>
                <h2>{canWrite ? "Editar precios" : "Historial de precios"}</h2>
                <p>
                  {selected.nombre} · {selected.sku}
                </p>
              </div>
              <button
                type="button"
                className={adminStyles.clearBtn}
                aria-label="Cerrar precios"
                disabled={saving}
                onClick={close}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={save} className={adminStyles.form}>
              <div className={adminStyles.fieldGrid}>
                {PRICE_LEVELS.map((level) => (
                  <label className={adminStyles.field} key={level.id}>
                    {level.label} (L)
                    <input
                      autoFocus={canWrite && level.id === "normal"}
                      type="number"
                      inputMode="decimal"
                      min={level.id === "normal" ? "1" : "0.01"}
                      max="9999999999.99"
                      step="0.01"
                      required={level.id === "normal"}
                      disabled={!canWrite || saving}
                      value={draft[level.field]}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [level.field]: event.target.value,
                        }))
                      }
                      placeholder={
                        level.id === "normal"
                          ? "Precio original de venta"
                          : "Opcional · sin configurar"
                      }
                    />
                  </label>
                ))}
              </div>
              <p className={styles.meta}>
                Los valores 2 y 3 no pueden superar el precio normal. Guardar
                tarifas no modifica cotizaciones, ventas ni facturas anteriores.
              </p>
              {formError && (
                <p className={styles.error} role="alert">
                  {formError}
                </p>
              )}
              <footer className={adminStyles.modalActions}>
                <button
                  type="button"
                  className={adminStyles.ghostBtn}
                  disabled={saving}
                  onClick={close}
                >
                  Cerrar
                </button>
                {canWrite && (
                  <button
                    className={adminStyles.primaryBtn}
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Guardando…" : "Guardar precios"}
                  </button>
                )}
              </footer>
              <section className={styles.history}>
                <h3>Historial de cambios · últimos 25</h3>
                {historyLoading && <p>Cargando historial…</p>}
                {historyError && (
                  <p className={styles.error} role="alert">
                    {historyError}
                  </p>
                )}
                {!historyLoading && !historyError && !history.length && (
                  <p className={styles.meta}>
                    Todavía no se han registrado cambios de tarifas.
                  </p>
                )}
                <ol>
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <strong>
                        {new Date(entry.fecha).toLocaleString("es-HN")}
                      </strong>{" "}
                      · {entry.actor || "Administración"}
                      <p>
                        {PRICE_LEVELS.map((level) => (
                          <small key={level.id}>
                            {level.label}:{" "}
                            {entry.antes
                              ? amount(entry.antes[level.field])
                              : "Sin registro previo"}{" "}
                            → {amount(entry.despues?.[level.field])}
                          </small>
                        ))}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
