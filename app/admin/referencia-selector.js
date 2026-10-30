"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { clientIdentity } from "@/lib/ventas-form";
import { formatPrice } from "./products-store";
import styles from "./ventas-form.module.css";

async function lookup(kind, params, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; cancel(); }, 12000);
  try {
    const response = await apiFetch(`${kind === "compras-productos" ? "/api/compras/productos" : kind === "proveedores" ? "/api/compras/proveedores" : `/api/ventas/${kind}`}?${new URLSearchParams(params)}`, { cache: "no-store", signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo realizar la búsqueda.");
    if (!Array.isArray(data.items)) throw new Error("La búsqueda devolvió una respuesta inválida.");
    return data;
  } catch (error) {
    if (timedOut) throw new Error("La búsqueda tardó demasiado. Reintenta cuando tengas conexión.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}

function detail(kind, item) {
  if (kind === "proveedores") return [Object.hasOwn(item, "rtn") ? item.rtn ? `ID / RTN: ${item.rtn}` : "Sin identificación registrada" : "Consultando proveedor…", item.contacto || item.telefono || item.email].filter(Boolean).join(" · ");
  if (kind === "compras-productos") return [item.sku, Object.hasOwn(item, "costo") ? item.costo == null ? "Costo por acordar" : `Costo ${formatPrice(item.costo)}` : "Consultando costo…", item.unidad].filter(Boolean).join(" · ");
  if (kind === "clientes" && !Object.hasOwn(item, "rtn")) return "Consultando identificación guardada…";
  if (kind === "productos" && !Object.hasOwn(item, "precio")) return "Consultando SKU y tarifas del catálogo…";
  return kind === "clientes" ? clientIdentity(item) : [
    item.sku, formatPrice(item.precio), item.unidad,
    item.archivado || item.estado !== "activo" ? "No disponible para nuevas líneas" : "",
  ].filter(Boolean).join(" · ");
}

/** Combobox remoto. El texto escrito nunca equivale a seleccionar un ID. */
export default function ReferenciaSelector({ kind, value = "", fallback, onChange, onResolved, label, disabled = false, onCreate }) {
  const id = useId();
  const root = useRef(null), input = useRef(null);
  const [search, setSearch] = useState({ text: "", editing: false });
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [selectedError, setSelectedError] = useState(null);
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [highlight, setHighlight] = useState({ key: "", index: -1 });
  const resolvedCallback = useRef(onResolved);
  useEffect(() => { resolvedCallback.current = onResolved; }, [onResolved]);

  const selected = value ? (current?.id === value ? current : fallback?.id === value ? fallback : null) : null;
  const text = search.editing ? search.text : selected?.nombre || "";
  const searchKey = `${kind}:${text.trim()}:${retry}`;
  const fresh = result?.key === searchKey;
  const items = fresh ? result.items : [];
  const active = highlight.key === searchKey ? highlight.index : -1;
  const activeId = open && items[active] ? `${id}-option-${active}` : undefined;

  useEffect(() => {
    if (!value || disabled) return;
    const controller = new AbortController();
    lookup(kind, { id: value }, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (!data.items[0]) throw new Error("El registro seleccionado ya no está disponible.");
      setCurrent(data.items[0]);
      setSearch({ text: data.items[0].nombre, editing: false });
      setSelectedError(null);
      resolvedCallback.current?.(data.items[0]);
    }).catch(error => {
      if (!controller.signal.aborted) setSelectedError({ id: value, message: error.message });
    });
    return () => controller.abort();
  }, [kind, value, disabled, retry]);

  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      lookup(kind, { q: text.trim(), take: "12" }, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult({ key: searchKey, items: data.items, hasMore: data.hasMore });
      }).catch(error => {
        if (!controller.signal.aborted) setResult({ key: searchKey, items: [], error: error.message });
      });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, text, open, disabled, searchKey]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function choose(item) {
    setCurrent(item);
    setSearch({ text: item.nombre, editing: false });
    setOpen(false);
    setSelectedError(null);
    onChange(item);
    resolvedCallback.current?.(item);
  }

  function keyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (items.length) setHighlight({ key: searchKey, index: event.key === "ArrowDown" ? (active + 1) % items.length : (active <= 0 ? items.length - 1 : active - 1) });
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (items[active]) choose(items[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
  }

  return (
    <div className={styles.picker} ref={root}>
      <label className={styles.label} htmlFor={id}>{label || (kind === "clientes" ? "Cliente" : "Producto")}</label>
      <div className={styles.inputRow}>
        <input
          ref={input}
          id={id}
          className={styles.input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          aria-controls={`${id}-list`}
          aria-activedescendant={activeId}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          maxLength={100}
          disabled={disabled}
          value={text}
          placeholder={kind === "clientes" ? "Escribe nombre o identificación / RTN" : "Busca por nombre, SKU o código"}
          onFocus={() => {
            setSearch(previous => previous.editing ? previous : { text: selected?.nombre || "", editing: true });
            setOpen(true);
          }}
          onChange={event => {
            setSearch({ text: event.target.value, editing: true });
            setOpen(true);
            setHighlight({ key: "", index: -1 });
            if (value) onChange(null);
          }}
          onKeyDown={keyDown}
        />
        {(value || text) && <button type="button" className={styles.clear} disabled={disabled} aria-label={kind === "clientes" ? "Limpiar cliente" : `Limpiar ${label || "producto"}`} onClick={() => {
          setSearch({ text: "", editing: true });
          setOpen(true);
          setHighlight({ key: "", index: -1 });
          onChange(null);
          input.current?.focus();
        }}>×</button>}
      </div>

      <small id={`${id}-hint`} className={styles.hint}>
        {selected ? detail(kind, selected) : kind === "clientes" ? "Selecciona un resultado; el nombre escrito por sí solo no elige un cliente." : "Selecciona un producto para cargar sus tarifas de venta."}
      </small>
      {selectedError?.id === value && <div className={styles.error} role="status">{selectedError.message} <button type="button" className={styles.clear} aria-label="Reintentar registro seleccionado" onClick={() => setRetry(previous => previous + 1)}>↻</button></div>}

      {open && !disabled && <>
        <div className={styles.results} id={`${id}-list`} role="listbox" aria-label={`Resultados de ${label || kind}`} aria-busy={!fresh}>
          {items.map((item, index) => <button
            type="button"
            role="option"
            tabIndex={-1}
            key={item.id}
            id={`${id}-option-${index}`}
            className={styles.option}
            aria-selected={active === index || (active < 0 && value === item.id)}
            onMouseDown={event => event.preventDefault()}
            onPointerMove={() => setHighlight({ key: searchKey, index })}
            onClick={() => choose(item)}
          >
            <strong>{item.nombre}</strong>
            <span>{detail(kind, item)}</span>
          </button>)}
        </div>
        <div className={fresh && result.error ? styles.error : styles.hint} role="status" aria-live="polite">
          {!fresh ? "Buscando…" : result.error || (items.length ? `${items.length} resultados${result.hasMore ? "; escribe más para afinar la búsqueda" : ""}.` : "Sin coincidencias. Prueba otro nombre o identificación.")}
        </div>
        {fresh && result.error && <button type="button" className={styles.clear} aria-label="Reintentar búsqueda" onClick={() => setRetry(previous => previous + 1)}>↻</button>}
      </>}
      {onCreate && <button type="button" disabled={disabled} className={styles.option} onClick={() => { setOpen(false); onCreate(value ? "" : text); }}>+ Crear cliente eventual / nuevo</button>}
    </div>
  );
}
