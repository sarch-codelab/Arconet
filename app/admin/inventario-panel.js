"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Package,
  Plus,
  RefreshCw,
  ScrollText,
  Trash2,
  Warehouse,
} from "lucide-react";
import { sileo } from "../toaster";
import { SectionTabs, Topbar } from "./topbar";
import adminStyles from "./admin-experience.module.css";
import styles from "./inventario-panel.module.css";

const TABS = [
  { id: "stock", label: "Stock", icon: Boxes, title: "Existencias por bodega" },
  { id: "kardex", label: "Kardex", icon: ScrollText, title: "Historial de movimientos" },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight, title: "Registrar entrada, salida, ajuste o transferencia" },
  { id: "bodegas", label: "Bodegas", icon: Warehouse, title: "Bodegas y almacenes" },
  { id: "alertas", label: "Alertas", icon: AlertTriangle, title: "Punto de reorden" },
];

const TIPOS = [
  { id: "entrada", label: "Entrada" },
  { id: "salida", label: "Salida" },
  { id: "ajuste", label: "Ajuste (+/-)" },
  { id: "transferencia", label: "Transferencia" },
  { id: "devolucion", label: "Devolución" },
];

const TIPO_LABEL = Object.fromEntries(TIPOS.map((tipo) => [tipo.id, tipo.label]));
// El Kardex ya no se corta en 200 filas sin avisar: se pagina contra el API,
// que devuelve { total, take, skip, movimientos }.
const KARDEX_PAGE_SIZE = 100;
const EMPTY_MOVIMIENTO = {
  tipo: "entrada",
  productoId: "",
  bodegaId: "",
  bodegaDestinoId: "",
  cantidad: "",
  costoUnitario: "",
  motivo: "",
  referencia: "",
};
const EMPTY_BODEGA = { nombre: "", codigo: "", direccion: "", esPrincipal: false, estado: "activo" };

async function request(url, options) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function formatFecha(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumero(value) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero.toLocaleString("es-HN") : "—";
}

export default function InventarioPanel({ session, productos: productosIniciales = [], navigation, activeTab, onTabChange }) {
  const permisos = Array.isArray(session?.permisos) ? session.permisos : [];
  const canWrite = permisos.includes("inventario:write");
  const canDelete = permisos.includes("inventario:delete");
  // Este permiso de apoyo no depende de exports del módulo de navegación:
  // Inventario debe poder montar también al recuperar un bundle anterior.
  const canReadProductos = permisos.includes("productos:read") || permisos.includes("inventario:read");
  const [internalTab, setInternalTab] = useState("stock");
  const tab = activeTab || internalTab;
  const setTab = onTabChange || setInternalTab;
  const [stock, setStock] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [productos, setProductos] = useState(productosIniciales);
  const [alertas, setAlertas] = useState({ alertas: [], agotados: [], total: 0 });
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [bodegaFiltro, setBodegaFiltro] = useState("");
  const [kardexProducto, setKardexProducto] = useState("");
  const [kardexBodega, setKardexBodega] = useState("");
  const [kardexTipo, setKardexTipo] = useState("");
  const [kardexDesde, setKardexDesde] = useState("");
  const [kardexHasta, setKardexHasta] = useState("");
  const [kardexPagina, setKardexPagina] = useState(0);
  const [kardexTotal, setKardexTotal] = useState(0);
  const [movimiento, setMovimiento] = useState(EMPTY_MOVIMIENTO);
  const [guardando, setGuardando] = useState(false);
  const [bodegaDraft, setBodegaDraft] = useState(EMPTY_BODEGA);
  const [editandoBodega, setEditandoBodega] = useState("");

  const cargarBase = useCallback(async () => {
    setLoading(true);
    try {
      const [stockData, bodegasData, productosData, alertasData] = await Promise.all([
        request("/api/inventario/stock"),
        request("/api/bodegas"),
        canReadProductos ? request("/api/productos?take=500") : Promise.resolve(null),
        request("/api/inventario/alertas"),
      ]);
      setStock(Array.isArray(stockData) ? stockData : []);
      setBodegas(Array.isArray(bodegasData) ? bodegasData : []);
      setProductos(Array.isArray(productosData) ? productosData : [...new Map((stockData || []).filter(fila => fila.producto).map(fila => [fila.productoId, fila.producto])).values()]);
      setAlertas(alertasData || { alertas: [], agotados: [], total: 0 });
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [canReadProductos]);

  const cargarKardex = useCallback(async () => {
    const params = new URLSearchParams({ take: String(KARDEX_PAGE_SIZE), skip: String(kardexPagina * KARDEX_PAGE_SIZE) });
    if (kardexProducto) params.set("productoId", kardexProducto);
    if (kardexBodega) params.set("bodegaId", kardexBodega);
    if (kardexTipo) params.set("tipo", kardexTipo);
    if (kardexDesde) params.set("desde", kardexDesde);
    if (kardexHasta) params.set("hasta", kardexHasta);
    try {
      const data = await request(`/api/inventario/kardex?${params}`);
      setMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : []);
      setKardexTotal(Number(data?.total) || 0);
    } catch (err) {
      setError(err.message || "No se pudo cargar el kardex.");
    }
  }, [kardexProducto, kardexBodega, kardexTipo, kardexDesde, kardexHasta, kardexPagina]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  useEffect(() => {
    cargarKardex();
  }, [cargarKardex]);

  useEffect(() => {
    setMovimiento((current) =>
      current.productoId || !productos.length
        ? current
        : { ...current, productoId: productos[0].id },
    );
  }, [productos]);

  useEffect(() => {
    setMovimiento((current) =>
      current.bodegaId || !bodegas.length ? current : { ...current, bodegaId: bodegas[0].id },
    );
  }, [bodegas]);

  const productosPorId = useMemo(
    () => Object.fromEntries(productos.map((producto) => [producto.id, producto])),
    [productos],
  );
  const bodegasPorId = useMemo(
    () => Object.fromEntries(bodegas.map((bodega) => [bodega.id, bodega])),
    [bodegas],
  );

  const stockFiltrado = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-HN");
    return stock.filter((fila) => {
      if (bodegaFiltro && fila.bodegaId !== bodegaFiltro) return false;
      if (!q) return true;
      return `${fila.producto?.nombre} ${fila.producto?.sku} ${fila.bodega?.nombre}`
        .toLocaleLowerCase("es-HN")
        .includes(q);
    });
  }, [stock, query, bodegaFiltro]);

  const totalUnidades = useMemo(
    () => stock.reduce((sum, fila) => sum + Number(fila.cantidad || 0), 0),
    [stock],
  );
  const bodegasActivas = bodegas.filter((bodega) => bodega.estado === "activo");
  const totalAlertas = (alertas.alertas?.length || 0) + (alertas.agotados?.length || 0);

  async function registrarMovimiento(event) {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const payload = {
        tipo: movimiento.tipo,
        productoId: movimiento.productoId,
        bodegaId: movimiento.bodegaId,
        cantidad:
          movimiento.tipo === "ajuste"
            ? Number(movimiento.cantidad)
            : Math.abs(Number(movimiento.cantidad)),
        ...(movimiento.tipo === "transferencia" ? { bodegaDestinoId: movimiento.bodegaDestinoId } : {}),
        ...(movimiento.costoUnitario !== "" ? { costoUnitario: Number(movimiento.costoUnitario) } : {}),
        ...(movimiento.motivo ? { motivo: movimiento.motivo } : {}),
        ...(movimiento.referencia ? { referencia: movimiento.referencia } : {}),
      };
      await request("/api/inventario/movimientos", { method: "POST", body: JSON.stringify(payload) });
      sileo.success({ title: "Movimiento registrado", description: "El kardex y el stock quedaron actualizados." });
      setMovimiento((current) => ({ ...current, cantidad: "", motivo: "", referencia: "", costoUnitario: "" }));
      await Promise.all([cargarBase(), cargarKardex()]);
    } catch (err) {
      sileo.error({ title: "No se pudo registrar", description: err.message, duration: 7000 });
    } finally {
      setGuardando(false);
    }
  }

  async function guardarBodega(event) {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const payload = {
        nombre: bodegaDraft.nombre,
        ...(bodegaDraft.codigo ? { codigo: bodegaDraft.codigo } : {}),
        ...(bodegaDraft.direccion ? { direccion: bodegaDraft.direccion } : {}),
        esPrincipal: bodegaDraft.esPrincipal,
        estado: bodegaDraft.estado,
      };
      if (editandoBodega) {
        await request(`/api/bodegas/${encodeURIComponent(editandoBodega)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        sileo.success({ title: "Bodega actualizada" });
      } else {
        await request("/api/bodegas", { method: "POST", body: JSON.stringify(payload) });
        sileo.success({ title: "Bodega creada" });
      }
      setBodegaDraft(EMPTY_BODEGA);
      setEditandoBodega("");
      await cargarBase();
    } catch (err) {
      sileo.error({ title: "No se pudo guardar la bodega", description: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarBodega(bodega) {
    if (!window.confirm(`¿Eliminar la bodega "${bodega.nombre}"? Si tiene historial se desactivará.`)) return;
    try {
      const data = await request(`/api/bodegas/${encodeURIComponent(bodega.id)}`, { method: "DELETE" });
      sileo.success({
        title: data?.desactivada ? "Bodega desactivada" : "Bodega eliminada",
        description: data?.desactivada ? "Tenía movimientos: se conservó el historial." : undefined,
      });
      await cargarBase();
    } catch (err) {
      sileo.error({ title: "No se pudo eliminar", description: err.message });
    }
  }

  function editarBodega(bodega) {
    setEditandoBodega(bodega.id);
    setBodegaDraft({
      nombre: bodega.nombre,
      codigo: bodega.codigo || "",
      direccion: bodega.direccion || "",
      esPrincipal: Boolean(bodega.esPrincipal),
      estado: bodega.estado || "activo",
    });
    setTab("bodegas");
  }

  const movimientoInvalido =
    !movimiento.productoId ||
    !movimiento.bodegaId ||
    !movimiento.cantidad ||
    Number(movimiento.cantidad) === 0 ||
    (movimiento.tipo === "transferencia" && !movimiento.bodegaDestinoId);

  return (
    <>
      <Topbar
        title="Inventario"
        subtitle="Existencias por bodega, kardex auditable y movimientos que alimentan el stock del catálogo."
        action={
          <button type="button" className={adminStyles.ghostBtn} onClick={() => { cargarBase(); cargarKardex(); }}>
            <RefreshCw size={15} /> Actualizar
          </button>
        }
        session={session}
      />

      <div className={adminStyles.body}>
        {navigation || <SectionTabs tabs={TABS} activeTab={tab} onTabChange={setTab} label="Secciones de inventario" />}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <section className={adminStyles.stats} aria-label="Resumen de inventario">
          <article className={adminStyles.statCard}>
            <span className={adminStyles.statIcon}><Package size={18} /></span>
            <strong className={adminStyles.statValue}>{productos.length}</strong>
            <span className={adminStyles.statLabel}>Productos</span>
          </article>
          <article className={adminStyles.statCard}>
            <span className={adminStyles.statIcon}><Boxes size={18} /></span>
            <strong className={adminStyles.statValue}>{formatNumero(totalUnidades)}</strong>
            <span className={adminStyles.statLabel}>Unidades en bodega</span>
          </article>
          <article className={adminStyles.statCard}>
            <span className={adminStyles.statIcon}><Warehouse size={18} /></span>
            <strong className={adminStyles.statValue}>{bodegasActivas.length}</strong>
            <span className={adminStyles.statLabel}>Bodegas activas</span>
          </article>
          <article className={adminStyles.statCard}>
            <span className={adminStyles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={adminStyles.statValue}>{totalAlertas}</strong>
            <span className={adminStyles.statLabel}>Alertas de stock</span>
          </article>
        </section>

        {tab === "stock" && (
          <>
            <div className={adminStyles.toolbar}>
              <label className={adminStyles.search}>
                <Package size={16} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar producto, SKU o bodega"
                  aria-label="Buscar en el stock"
                />
              </label>
              <select
                className={adminStyles.select}
                value={bodegaFiltro}
                onChange={(event) => setBodegaFiltro(event.target.value)}
                aria-label="Filtrar por bodega"
              >
                <option value="">Todas las bodegas</option>
                {bodegas.map((bodega) => (
                  <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                ))}
              </select>
            </div>

            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Bodega</th>
                    <th>Cantidad</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th className={adminStyles.actionsCol}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.map((fila) => {
                    const cantidad = Number(fila.cantidad || 0);
                    const minimo = Number(fila.producto?.stockMinimo || 0);
                    const agotado = cantidad <= 0;
                    const bajo = !agotado && minimo > 0 && cantidad <= minimo;
                    return (
                      <tr key={`${fila.productoId}-${fila.bodegaId}`}>
                        <td data-label="Producto" className={adminStyles.cellMain}>
                          <div className={adminStyles.person}>
                            <span className={`${adminStyles.avatar} ${adminStyles.roleBadgeIcon}`}>
                              <Package size={14} />
                            </span>
                            <span className={adminStyles.personMeta}>
                              <strong>{fila.producto?.nombre || "—"}</strong>
                              <em>{fila.producto?.sku || ""}</em>
                            </span>
                          </div>
                        </td>
                        <td data-label="Bodega">{fila.bodega?.nombre || "—"}</td>
                        <td data-label="Cantidad"><strong>{formatNumero(cantidad)}</strong> {fila.producto?.unidad || ""}</td>
                        <td data-label="Mínimo">{minimo ? formatNumero(minimo) : "—"}</td>
                        <td data-label="Estado">
                          <span className={agotado ? adminStyles.stockOut : bajo ? adminStyles.stockLow : adminStyles.stockOk}>
                            {agotado ? "Agotado" : bajo ? "Bajo mínimo" : "Disponible"}
                          </span>
                        </td>
                        <td data-label="Acciones" className={adminStyles.actionsCol}>
                          <button
                            type="button"
                            className={adminStyles.ghostBtn}
                            onClick={() => {
                              setKardexProducto(fila.productoId);
                              setKardexBodega(fila.bodegaId);
                              setTab("kardex");
                            }}
                          >
                            <ScrollText size={14} /> Kardex
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && !stockFiltrado.length ? (
                <div className={adminStyles.empty}>
                  <span className={adminStyles.emptyIcon}><Boxes size={22} /></span>
                  <p className={adminStyles.emptyText}>Todavía no hay existencias registradas en bodega.</p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {tab === "kardex" && (
          <>
            <div className={adminStyles.toolbar}>
              <select
                className={adminStyles.select}
                value={kardexProducto}
                onChange={(event) => { setKardexProducto(event.target.value); setKardexPagina(0); }}
                aria-label="Filtrar kardex por producto"
              >
                <option value="">Todos los productos</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                ))}
              </select>
              <select
                className={adminStyles.select}
                value={kardexBodega}
                onChange={(event) => { setKardexBodega(event.target.value); setKardexPagina(0); }}
                aria-label="Filtrar kardex por bodega"
              >
                <option value="">Todas las bodegas</option>
                {bodegas.map((bodega) => (
                  <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                ))}
              </select>
              <select
                className={adminStyles.select}
                value={kardexTipo}
                onChange={(event) => { setKardexTipo(event.target.value); setKardexPagina(0); }}
                aria-label="Filtrar kardex por tipo"
              >
                <option value="">Todos los tipos</option>
                {TIPOS.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
              <label className={adminStyles.field}>
                <span>Desde</span>
                <input
                  type="date"
                  className={adminStyles.input}
                  value={kardexDesde}
                  onChange={(event) => { setKardexDesde(event.target.value); setKardexPagina(0); }}
                  aria-label="Filtrar kardex desde la fecha"
                />
              </label>
              <label className={adminStyles.field}>
                <span>Hasta</span>
                <input
                  type="date"
                  className={adminStyles.input}
                  value={kardexHasta}
                  onChange={(event) => { setKardexHasta(event.target.value); setKardexPagina(0); }}
                  aria-label="Filtrar kardex hasta la fecha"
                />
              </label>
            </div>

            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Bodega</th>
                    <th>Movimiento</th>
                    <th>Saldo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((item) => {
                    const signo = item.tipo === "salida" ? "−" : item.tipo === "ajuste" && item.cantidad < 0 ? "−" : "+";
                    return (
                      <tr key={item.id}>
                        <td data-label="Fecha">{formatFecha(item.fecha)}</td>
                        <td data-label="Tipo"><span className={styles.tipoBadge} data-tipo={item.tipo}>{TIPO_LABEL[item.tipo] || item.tipo}</span></td>
                        <td data-label="Producto">
                          <strong>{item.producto?.nombre || "—"}</strong>
                          <br />
                          <small>{item.producto?.sku || ""}</small>
                        </td>
                        <td data-label="Bodega">
                          {item.bodega?.nombre || "—"}
                          {item.tipo === "transferencia" && item.bodegaDestino ? (
                            <>
                              {" → "}
                              <strong>{item.bodegaDestino.nombre}</strong>
                            </>
                          ) : null}
                          {item.tipo === "transferencia" && !item.bodegaDestino && item.bodegaDestinoId ? (
                            <>
                              {" → "}
                              <small>{item.bodegaDestinoId}</small>
                            </>
                          ) : null}
                        </td>
                        <td data-label="Movimiento">
                          <strong>{signo}{formatNumero(Math.abs(item.cantidad))}</strong>
                        </td>
                        <td data-label="Saldo">{formatNumero(item.saldoAnterior)} → {formatNumero(item.saldoDespues)}</td>
                        <td data-label="Motivo">
                          {item.motivo || "—"}
                          {item.referencia ? <><br /><small>{item.referencia}</small></> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!movimientos.length ? (
                <div className={adminStyles.empty}>
                  <span className={adminStyles.emptyIcon}><ScrollText size={22} /></span>
                  <p className={adminStyles.emptyText}>Sin movimientos para los filtros elegidos.</p>
                </div>
              ) : null}
            </div>

            {kardexTotal > KARDEX_PAGE_SIZE ? (
              <div className={adminStyles.pagination} aria-label="Paginación del kardex">
                <button
                  type="button"
                  className={adminStyles.ghostBtn}
                  onClick={() => setKardexPagina((p) => Math.max(p - 1, 0))}
                  disabled={kardexPagina === 0}
                >
                  Anterior
                </button>
                <span className={adminStyles.pageInfo}>
                  Mostrando {kardexPagina * KARDEX_PAGE_SIZE + 1}–
                  {Math.min((kardexPagina + 1) * KARDEX_PAGE_SIZE, kardexTotal)} de {formatNumero(kardexTotal)}
                </span>
                <button
                  type="button"
                  className={adminStyles.ghostBtn}
                  onClick={() => setKardexPagina((p) => p + 1)}
                  disabled={(kardexPagina + 1) * KARDEX_PAGE_SIZE >= kardexTotal}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </>
        )}

        {tab === "movimientos" && (
          <div className={styles.splitGrid}>
            <section className={adminStyles.card}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Kardex</p>
                  <h3>Registrar movimiento</h3>
                </div>
              </header>
              <form className={`${adminStyles.form} ${adminStyles.cardBody}`} onSubmit={registrarMovimiento}>
                <div className={adminStyles.fieldGrid}>
                  <label className={adminStyles.field}>
                    Tipo
                    <select
                      disabled={!canWrite} value={movimiento.tipo}
                      onChange={(event) => setMovimiento({ ...movimiento, tipo: event.target.value })}
                    >
                      {TIPOS.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className={adminStyles.field}>
                    Producto
                    <select
                      disabled={!canWrite} value={movimiento.productoId}
                      onChange={(event) => setMovimiento({ ...movimiento, productoId: event.target.value })}
                      required
                    >
                      <option value="">Selecciona un producto</option>
                      {productos.map((producto) => (
                        <option key={producto.id} value={producto.id}>
                          {producto.nombre} · stock {formatNumero(producto.stock)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={adminStyles.field}>
                    Bodega
                    <select
                      disabled={!canWrite} value={movimiento.bodegaId}
                      onChange={(event) => setMovimiento({ ...movimiento, bodegaId: event.target.value })}
                      required
                    >
                      <option value="">Selecciona una bodega</option>
                      {bodegas.map((bodega) => (
                        <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                      ))}
                    </select>
                  </label>

                  {movimiento.tipo === "transferencia" ? (
                    <label className={adminStyles.field}>
                      Bodega destino
                      <select
                        disabled={!canWrite} value={movimiento.bodegaDestinoId}
                        onChange={(event) => setMovimiento({ ...movimiento, bodegaDestinoId: event.target.value })}
                        required
                      >
                        <option value="">Selecciona destino</option>
                        {bodegas
                          .filter((bodega) => bodega.id !== movimiento.bodegaId)
                          .map((bodega) => (
                            <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                          ))}
                      </select>
                    </label>
                  ) : null}

                  <label className={adminStyles.field}>
                    Cantidad
                    <input
                      type="number"
                      step={1}
                      disabled={!canWrite} value={movimiento.cantidad}
                      onChange={(event) => setMovimiento({ ...movimiento, cantidad: event.target.value })}
                      placeholder="0"
                      required
                    />
                    {movimiento.tipo === "ajuste" ? (
                      <small className={adminStyles.fieldHint}>Usa un número negativo para restar.</small>
                    ) : null}
                  </label>

                  <label className={adminStyles.field}>
                    Costo unitario (opcional)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canWrite} value={movimiento.costoUnitario}
                      onChange={(event) => setMovimiento({ ...movimiento, costoUnitario: event.target.value })}
                      placeholder="0.00"
                    />
                  </label>

                  <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                    Motivo
                    <input
                      type="text"
                      disabled={!canWrite} value={movimiento.motivo}
                      onChange={(event) => setMovimiento({ ...movimiento, motivo: event.target.value })}
                      placeholder="Compra, ajuste de conteo, devolución…"
                    />
                  </label>

                  <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                    Referencia (opcional)
                    <input
                      type="text"
                      disabled={!canWrite} value={movimiento.referencia}
                      onChange={(event) => setMovimiento({ ...movimiento, referencia: event.target.value })}
                      placeholder="Factura, guía o documento externo"
                    />
                  </label>
                </div>

                <div className={adminStyles.modalActions}>
                  <button type="submit" className={adminStyles.primaryBtn} disabled={!canWrite || guardando || movimientoInvalido}>
                    <Plus size={16} /> {guardando ? "Guardando…" : "Registrar movimiento"}
                  </button>
                </div>
              </form>
            </section>

            <section className={adminStyles.card}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Últimos</p>
                  <h3>Movimientos recientes</h3>
                </div>
              </header>
              <div className={adminStyles.cardBody}>
                {movimientos.slice(0, 8).map((item) => (
                  <div key={item.id} className={styles.movimientoItem}>
                    <span className={styles.tipoBadge} data-tipo={item.tipo}>{TIPO_LABEL[item.tipo] || item.tipo}</span>
                    <div>
                      <strong>{item.producto?.nombre || "Producto"}</strong>
                      <small>{formatFecha(item.fecha)} · {item.bodega?.nombre || "—"}</small>
                    </div>
                    <strong>{item.tipo === "salida" ? "−" : "+"}{formatNumero(Math.abs(item.cantidad))}</strong>
                  </div>
                ))}
                {!movimientos.length ? (
                  <p className={adminStyles.emptyText}>Aún no hay movimientos registrados.</p>
                ) : null}
              </div>
            </section>
          </div>
        )}

        {tab === "bodegas" && (
          <div className={styles.splitGrid}>
            <section className={adminStyles.card}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>{editandoBodega ? "Editar" : "Nueva"}</p>
                  <h3>{editandoBodega ? "Editar bodega" : "Agregar bodega"}</h3>
                </div>
              </header>
              <form className={`${adminStyles.form} ${adminStyles.cardBody}`} onSubmit={guardarBodega}>
                <div className={adminStyles.fieldGrid}>
                  <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                    Nombre
                    <input
                      type="text"
                      disabled={!canWrite} value={bodegaDraft.nombre}
                      onChange={(event) => setBodegaDraft({ ...bodegaDraft, nombre: event.target.value })}
                      placeholder="Bodega La Ceiba"
                      required
                    />
                  </label>
                  <label className={adminStyles.field}>
                    Código
                    <input
                      type="text"
                      disabled={!canWrite} value={bodegaDraft.codigo}
                      onChange={(event) => setBodegaDraft({ ...bodegaDraft, codigo: event.target.value })}
                      placeholder="BOD-LCE"
                    />
                  </label>
                  <label className={adminStyles.field}>
                    Estado
                    <select
                      disabled={!canWrite} value={bodegaDraft.estado}
                      onChange={(event) => setBodegaDraft({ ...bodegaDraft, estado: event.target.value })}
                    >
                      <option value="activo">Activa</option>
                      <option value="inactivo">Inactiva</option>
                    </select>
                  </label>
                  <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                    Dirección
                    <input
                      type="text"
                      disabled={!canWrite} value={bodegaDraft.direccion}
                      onChange={(event) => setBodegaDraft({ ...bodegaDraft, direccion: event.target.value })}
                      placeholder="Ubicación física"
                    />
                  </label>
                </div>

                <label className={adminStyles.checkbox}>
                  <input
                    type="checkbox"
                    checked={bodegaDraft.esPrincipal}
                    onChange={(event) => setBodegaDraft({ ...bodegaDraft, esPrincipal: event.target.checked })}
                  />
                  <span>✓</span>
                  Bodega principal (recibe las salidas automáticas de ventas y facturas)
                </label>

                <div className={adminStyles.modalActions}>
                  {editandoBodega ? (
                    <button
                      type="button"
                      className={adminStyles.ghostBtn}
                      onClick={() => { setEditandoBodega(""); setBodegaDraft(EMPTY_BODEGA); }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                  <button type="submit" className={adminStyles.primaryBtn} disabled={!canWrite || guardando}>
                    <Plus size={16} /> {editandoBodega ? "Guardar cambios" : "Crear bodega"}
                  </button>
                </div>
              </form>
            </section>

            <section className={adminStyles.tableCard}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Almacenes</p>
                  <h3>Bodegas registradas</h3>
                </div>
              </header>
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Bodega</th>
                      <th>Productos</th>
                      <th>Estado</th>
                      <th className={adminStyles.actionsCol}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodegas.map((bodega) => (
                      <tr key={bodega.id}>
                        <td data-label="Bodega" className={adminStyles.cellMain}>
                          <strong>{bodega.nombre}</strong>
                          <br />
                          <small>{bodega.codigo}{bodega.esPrincipal ? " · principal" : ""}</small>
                        </td>
                        <td data-label="Productos">{formatNumero(bodega.productos || 0)}</td>
                        <td data-label="Estado">
                          <span className={bodega.estado === "activo" ? adminStyles.statusOk : adminStyles.statusInactive}>
                            {bodega.estado === "activo" ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td data-label="Acciones" className={adminStyles.actionsCol}>
                          <div className={adminStyles.rowActions}>
                            <button type="button" className={adminStyles.ghostBtn} disabled={!canWrite} onClick={() => editarBodega(bodega)}>
                              Editar
                            </button>
                            <button type="button" className={adminStyles.dangerBtn} disabled={!canDelete} onClick={() => eliminarBodega(bodega)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!bodegas.length ? (
                  <div className={adminStyles.empty}>
                    <span className={adminStyles.emptyIcon}><Warehouse size={22} /></span>
                    <p className={adminStyles.emptyText}>Crea la primera bodega para empezar a mover inventario.</p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}

        {tab === "alertas" && (
          <section className={adminStyles.tableCard}>
            <header className={adminStyles.cardHeader}>
              <div>
                <p className={adminStyles.eyebrow}>Reabastecimiento</p>
                <h3>Productos en o bajo el punto de reorden</h3>
              </div>
            </header>
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Mínimo</th>
                    <th>Situación</th>
                    <th className={adminStyles.actionsCol}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(alertas.agotados || []), ...(alertas.alertas || [])]
                    .filter((item, index, lista) => lista.findIndex((otro) => otro.id === item.id) === index)
                    .map((producto) => {
                      const agotado = Number(producto.stock) <= 0;
                      return (
                        <tr key={producto.id}>
                          <td data-label="Producto" className={adminStyles.cellMain}>
                            <strong>{producto.nombre}</strong>
                            <br />
                            <small>{producto.sku}</small>
                          </td>
                          <td data-label="Stock actual">{formatNumero(producto.stock)} {producto.unidad}</td>
                          <td data-label="Mínimo">{formatNumero(producto.stockMinimo)}</td>
                          <td data-label="Situación">
                            <span className={agotado ? adminStyles.stockOut : adminStyles.stockLow}>
                              {agotado ? "Agotado" : "Bajo mínimo"}
                            </span>
                          </td>
                          <td data-label="Acciones" className={adminStyles.actionsCol}>
                            <button
                              type="button"
                              className={adminStyles.ghostBtn}
                              onClick={() => {
                                setMovimiento({ ...EMPTY_MOVIMIENTO, tipo: "entrada", productoId: producto.id, bodegaId: bodegas[0]?.id || "" });
                                setTab("movimientos");
                              }}
                            >
                              <Plus size={14} /> Reponer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {!totalAlertas ? (
                <div className={adminStyles.empty}>
                  <span className={adminStyles.emptyIcon}><AlertTriangle size={22} /></span>
                  <p className={adminStyles.emptyText}>Ningún producto está por debajo de su mínimo.</p>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
