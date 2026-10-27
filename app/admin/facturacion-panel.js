"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Download,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { sileo } from "../toaster";
import { SectionTabs, Topbar } from "./topbar";
import adminStyles from "./admin-experience.module.css";
import styles from "./facturacion-panel.module.css";

const TABS = [
  { id: "documentos", label: "Documentos", icon: Receipt, title: "Facturas emitidas" },
  { id: "nueva", label: "Nueva factura", icon: Plus, title: "Emitir una factura" },
  { id: "libro", label: "Libro de ventas", icon: BookOpen, title: "Libro de ventas por rango" },
  { id: "config", label: "Configuración", icon: Settings2, title: "CAI, serie y datos fiscales" },
];

// Cuando el panel vive dentro de la sección unificada "Ventas", las pills
// externas usan ids propios ("facturas", "cotizaciones", ...). Este mapa traduce
// esos ids al sub-tab interno equivalente para que la navegación funcione.
const EXTERNAL_TO_INTERNAL = {
  facturas: "documentos",
  cotizaciones: "documentos",
  ventas: "documentos",
  pendientes: "documentos",
  aprobadas: "documentos",
  completadas: "documentos",
  todas: "documentos",
};

const IMPUESTOS = [
  { value: "15", label: "ISV 15%" },
  { value: "18", label: "ISV 18%" },
  { value: "0", label: "Exento" },
];

const TIPO_LABEL = { factura: "Factura", nota_credito: "Nota de crédito", nota_debito: "Nota de débito" };

let lineaSeq = 0;
function nuevaLinea(impuesto = 15) {
  lineaSeq += 1;
  return {
    key: `linea-${lineaSeq}`,
    productoId: "",
    descripcion: "",
    cantidad: "1",
    precio: "",
    descuento: "",
    impuestoPorcentaje: String(impuesto),
  };
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function inicioMesISO() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  const numero = Number(value) || 0;
  return `L ${numero.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFecha(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" });
}

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

export default function FacturacionPanel({ session, productos: productosIniciales = [], hideTopbar = false, chromeOnly = false, tabs, activeTab: controlledTab, onTabChange }) {
  const [innerTab, setInnerTab] = useState("documentos");
  // El tab real solo puede ser uno de los internos; si viene un id externo
  // (p. ej. "facturas" desde la sección Ventas) se traduce con el mapa.
  const tab = EXTERNAL_TO_INTERNAL[controlledTab] ?? innerTab;
  const setTab = (next) => {
    if (!EXTERNAL_TO_INTERNAL[next]) {
      // Sub-filtro interno (documentos/nueva/libro/config): no notifica afuera
      // para no cerrar el panel.
      setInnerTab(next);
      return;
    }
    // Pill externa: si es "facturas" muestra el panel; cualquier otra hace que
    // VentasSection monte CotizacionesSection en su lugar.
    onTabChange?.(next);
  };
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState(productosIniciales);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const [clienteId, setClienteId] = useState("");
  const [impuesto, setImpuesto] = useState(15);
  const [lineas, setLineas] = useState([nuevaLinea(15)]);

  const [libro, setLibro] = useState(null);
  const [desde, setDesde] = useState(inicioMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [configDraft, setConfigDraft] = useState({ cai: "", serie: "", correlativo: "", nit: "", nombre: "", direccion: "" });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, cli, prod, cfg] = await Promise.all([
        request("/api/facturacion/documentos"),
        request("/api/clientes?take=500"),
        request("/api/productos?take=500"),
        request("/api/facturacion/config"),
      ]);
      setDocumentos(Array.isArray(docs) ? docs : []);
      setClientes(Array.isArray(cli) ? cli : []);
      setProductos(Array.isArray(prod) ? prod : []);
      setConfig(cfg || null);
      setConfigDraft({
        cai: cfg?.cai || "",
        serie: cfg?.serie || "",
        correlativo: cfg?.correlativo ? String(cfg.correlativo) : "",
        nit: cfg?.nit || "",
        nombre: cfg?.nombre || "",
        direccion: cfg?.direccion || "",
      });
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo cargar la facturación.");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarLibro = useCallback(async () => {
    try {
      const data = await request(`/api/facturacion/libro-ventas?desde=${desde}&hasta=${hasta}`);
      setLibro(data);
    } catch (err) {
      sileo.error({ title: "No se pudo cargar el libro", description: err.message });
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (tab === "libro") cargarLibro();
  }, [tab, cargarLibro]);

  const documentosFiltrados = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-HN");
    if (!q) return documentos;
    return documentos.filter((doc) =>
      `${doc.correlativo || ""} ${doc.cliente?.nombre || ""} ${doc.cliente?.rtn || ""} ${doc.tipo}`
        .toLocaleLowerCase("es-HN")
        .includes(q),
    );
  }, [documentos, query]);

  const totales = useMemo(() => {
    let subtotal = 0;
    let descuento = 0;
    let impuestoTotal = 0;
    for (const linea of lineas) {
      const cantidad = Number(linea.cantidad) || 0;
      const precio = Number(linea.precio) || 0;
      const desc = Number(linea.descuento) || 0;
      const base = Math.max(0, cantidad * precio - desc);
      subtotal += base;
      descuento += desc;
      impuestoTotal += (base * (Number(linea.impuestoPorcentaje) || 0)) / 100;
    }
    const redondear = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    return {
      subtotal: redondear(subtotal),
      descuento: redondear(descuento),
      impuesto: redondear(impuestoTotal),
      total: redondear(subtotal + impuestoTotal),
    };
  }, [lineas]);

  const lineasValidas = lineas.length > 0 && lineas.every(
    (linea) =>
      linea.descripcion.trim() &&
      Number(linea.cantidad) > 0 &&
      linea.precio !== "" &&
      Number(linea.precio) >= 0,
  );

  function cambiarLinea(key, campo, valor) {
    setLineas((current) =>
      current.map((linea) => (linea.key === key ? { ...linea, [campo]: valor } : linea)),
    );
  }

  function elegirProducto(key, productoId) {
    const producto = productos.find((item) => item.id === productoId);
    setLineas((current) =>
      current.map((linea) =>
        linea.key === key
          ? {
              ...linea,
              productoId,
              descripcion: producto ? producto.nombre : "",
              precio: producto ? String(producto.precio) : "",
            }
          : linea,
      ),
    );
  }

  function agregarLinea() {
    setLineas((current) => [...current, nuevaLinea(impuesto)]);
  }

  function quitarLinea(key) {
    setLineas((current) => (current.length > 1 ? current.filter((linea) => linea.key !== key) : current));
  }

  async function emitir(event) {
    event.preventDefault();
    if (guardando) return;
    if (!clienteId) {
      sileo.error({ title: "Selecciona un cliente" });
      return;
    }
    if (!lineasValidas) {
      sileo.error({ title: "Revisa las líneas", description: "Cada línea necesita descripción, cantidad y precio." });
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        tipo: "factura",
        clienteId,
        impuestoPorcentaje: impuesto,
        items: lineas.map((linea) => ({
          ...(linea.productoId ? { productoId: linea.productoId } : {}),
          descripcion: linea.descripcion.trim(),
          cantidad: Number(linea.cantidad),
          precio: Number(linea.precio),
          descuento: Number(linea.descuento) || 0,
          impuestoPorcentaje: Number(linea.impuestoPorcentaje) || 0,
        })),
      };
      const data = await request("/api/facturacion/documentos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const doc = data.documento;
      sileo.success({
        title: data.tieneRango ? `Factura ${doc.correlativo} emitida` : "Factura emitida (pendiente de CAI)",
        description: `Total ${money(doc.total)}. El inventario se descontó de la bodega principal.`,
        duration: 7000,
      });
      setLineas([nuevaLinea(impuesto)]);
      await cargar();
      setTab("documentos");
    } catch (err) {
      sileo.error({
        title: "No se pudo emitir la factura",
        description: err.message,
        duration: 8000,
      });
    } finally {
      setGuardando(false);
    }
  }

  async function anular(documento) {
    const motivo = window.prompt(
      `Motivo de anulación de ${documento.correlativo || "la factura"}:`,
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      sileo.error({ title: "La anulación requiere un motivo" });
      return;
    }
    try {
      await request(`/api/facturacion/documentos/${encodeURIComponent(documento.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      sileo.success({
        title: "Documento anulado",
        description: "Se devolvió al inventario lo que había descontado.",
      });
      await cargar();
    } catch (err) {
      sileo.error({ title: "No se pudo anular", description: err.message });
    }
  }

  async function guardarConfig(event) {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      await request("/api/facturacion/config", {
        method: "PUT",
        body: JSON.stringify({
          ...configDraft,
          correlativo: configDraft.correlativo === "" ? undefined : Number(configDraft.correlativo),
        }),
      });
      sileo.success({ title: "Configuración fiscal guardada" });
      await cargar();
    } catch (err) {
      sileo.error({ title: "No se pudo guardar", description: err.message });
    } finally {
      setGuardando(false);
    }
  }

  const sinRango = !config?.tieneRango;

  return (
    <>
      {!hideTopbar && (
        <Topbar
          chromeOnly={chromeOnly}
          title="Facturación"
          subtitle="Emite facturas con CAI y correlativo, descuenta inventario y lleva el libro de ventas."
          action={
            <button type="button" className={adminStyles.ghostBtn} onClick={cargar}>
              <RefreshCw size={15} /> Actualizar
            </button>
          }
          session={session}
        />
      )}

      <div className={adminStyles.body}>
        {onTabChange && tabs ? (
          <SectionTabs tabs={tabs} activeTab={controlledTab} onTabChange={setTab} label="Secciones de ventas" />
        ) : null}

        {chromeOnly && hideTopbar && (
          <div className={adminStyles.sectionSubBar}>
            <div className={adminStyles.topbarTitle}>
              <h1>Ventas · Facturas</h1>
              <p>Emite facturas con CAI y correlativo, descuenta inventario y lleva el libro de ventas.</p>
            </div>
            <div className={adminStyles.topbarActions}>
              <button type="button" className={adminStyles.ghostBtn} onClick={cargar}>
                <RefreshCw size={15} /> Actualizar
              </button>
            </div>
          </div>
        )}

        <SectionTabs tabs={TABS} activeTab={tab} onTabChange={setTab} label="Secciones de facturación" />

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {sinRango ? (
          <div className={styles.warning} role="status">
            <AlertTriangle size={16} />
            <p>
              No hay rango autorizado configurado: las facturas se emiten como
              <strong> pendientes de CAI</strong> y no llevan correlativo fiscal.
              Configúralo en la pestaña Configuración.
            </p>
          </div>
        ) : null}

        {tab === "documentos" && (
          <>
            <div className={adminStyles.toolbar}>
              <label className={adminStyles.search}>
                <FileText size={16} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por número, cliente o RTN"
                  aria-label="Buscar documentos"
                />
              </label>
              <button type="button" className={adminStyles.primaryBtn} onClick={() => setTab("nueva")}>
                <Plus size={16} /> Nueva factura
              </button>
            </div>

            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th className={adminStyles.actionsCol}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((doc) => (
                    <tr key={doc.id}>
                      <td data-label="Documento" className={adminStyles.cellMain}>
                        <strong>{doc.correlativo || "Pendiente de CAI"}</strong>
                        <br />
                        <small>{TIPO_LABEL[doc.tipo] || doc.tipo}{doc.cai ? ` · CAI ${doc.cai}` : ""}</small>
                      </td>
                      <td data-label="Fecha">{formatFecha(doc.fecha)}</td>
                      <td data-label="Cliente">
                        {doc.cliente?.nombre || "—"}
                        {doc.cliente?.rtn ? <><br /><small>RTN {doc.cliente.rtn}</small></> : null}
                      </td>
                      <td data-label="Total"><strong>{money(doc.total)}</strong></td>
                      <td data-label="Estado">
                        <span className={doc.estado === "anulado" ? adminStyles.statusInactive : adminStyles.statusOk}>
                          {doc.estado === "anulado" ? "Anulada" : "Emitida"}
                        </span>
                      </td>
                      <td data-label="Acciones" className={adminStyles.actionsCol}>
                        <div className={adminStyles.rowActions}>
                          <button type="button" className={adminStyles.ghostBtn} onClick={() => setDetalle(doc)}>
                            Ver
                          </button>
                          <a
                            className={adminStyles.ghostBtn}
                            href={`/api/facturacion/documentos/${encodeURIComponent(doc.id)}/pdf?auto=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download size={14} /> Imprimir
                          </a>
                          {doc.estado !== "anulado" ? (
                            <button type="button" className={adminStyles.dangerBtn} onClick={() => anular(doc)}>
                              <Ban size={14} /> Anular
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!documentosFiltrados.length && !loading ? (
                <div className={adminStyles.empty}>
                  <span className={adminStyles.emptyIcon}><Receipt size={22} /></span>
                  <p className={adminStyles.emptyText}>Todavía no hay facturas emitidas.</p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {tab === "nueva" && (
          <form className={styles.invoiceGrid} onSubmit={emitir}>
            <section className={adminStyles.card}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Datos</p>
                  <h3>Cliente e impuesto</h3>
                </div>
              </header>
              <div className={`${adminStyles.form} ${adminStyles.cardBody}`}>
                <label className={adminStyles.field}>
                  Cliente
                  <select value={clienteId} onChange={(event) => setClienteId(event.target.value)} required>
                    <option value="">Selecciona un cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}{cliente.rtn ? ` · ${cliente.rtn}` : ""}
                      </option>
                    ))}
                  </select>
                  {!clientes.length ? (
                    <small className={adminStyles.fieldHint}>
                      No hay clientes registrados. Créalos en la sección Clientes antes de facturar.
                    </small>
                  ) : null}
                </label>

                <label className={adminStyles.field}>
                  Impuesto por defecto
                  <select
                    value={String(impuesto)}
                    onChange={(event) => {
                      const valor = Number(event.target.value);
                      setImpuesto(valor);
                      setLineas((current) =>
                        current.map((linea) => ({ ...linea, impuestoPorcentaje: String(valor) })),
                      );
                    }}
                  >
                    {IMPUESTOS.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                    ))}
                  </select>
                </label>

                <p className={adminStyles.fieldHint}>
                  Al emitir se descuenta el inventario de la bodega principal por cada
                  producto del catálogo. Las líneas libres no afectan existencias.
                </p>
              </div>
            </section>

            <section className={`${adminStyles.card} ${styles.linesCard}`}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Detalle</p>
                  <h3>Líneas de la factura</h3>
                </div>
                <button type="button" className={adminStyles.ghostBtn} onClick={agregarLinea}>
                  <Plus size={15} /> Agregar línea
                </button>
              </header>

              <div className={adminStyles.cardBody}>
                {lineas.map((linea) => {
                  const producto = productos.find((item) => item.id === linea.productoId);
                  const stock = Number(producto?.stock || 0);
                  const excede = Boolean(linea.productoId) && Number(linea.cantidad) > stock;
                  return (
                    <div className={styles.linea} key={linea.key}>
                      <div className={styles.lineaTop}>
                        <label className={adminStyles.field}>
                          Producto (opcional)
                          <select
                            value={linea.productoId}
                            onChange={(event) => elegirProducto(linea.key, event.target.value)}
                          >
                            <option value="">Concepto libre</option>
                            {productos.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nombre} · stock {item.stock}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className={adminStyles.dangerBtn}
                          onClick={() => quitarLinea(linea.key)}
                          aria-label="Quitar línea"
                          disabled={lineas.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <label className={adminStyles.field}>
                        Descripción
                        <input
                          type="text"
                          value={linea.descripcion}
                          onChange={(event) => cambiarLinea(linea.key, "descripcion", event.target.value)}
                          placeholder="Detalle del producto o servicio"
                          required
                        />
                      </label>

                      <div className={styles.lineaGrid}>
                        <label className={adminStyles.field}>
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={linea.cantidad}
                            onChange={(event) => cambiarLinea(linea.key, "cantidad", event.target.value)}
                            required
                          />
                        </label>
                        <label className={adminStyles.field}>
                          Precio unitario
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.precio}
                            onChange={(event) => cambiarLinea(linea.key, "precio", event.target.value)}
                            placeholder="0.00"
                            required
                          />
                        </label>
                        <label className={adminStyles.field}>
                          Descuento
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.descuento}
                            onChange={(event) => cambiarLinea(linea.key, "descuento", event.target.value)}
                            placeholder="0.00"
                          />
                        </label>
                        <label className={adminStyles.field}>
                          Impuesto
                          <select
                            value={linea.impuestoPorcentaje}
                            onChange={(event) => cambiarLinea(linea.key, "impuestoPorcentaje", event.target.value)}
                          >
                            {IMPUESTOS.map((opcion) => (
                              <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {excede ? (
                        <p className={styles.lineaAviso} role="alert">
                          <AlertTriangle size={13} /> Solo hay {stock} en inventario: la factura será rechazada.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.resumen}>
              <div className={styles.resumenFila}>
                <span>Subtotal</span>
                <strong>{money(totales.subtotal)}</strong>
              </div>
              <div className={styles.resumenFila}>
                <span>Descuento</span>
                <strong>− {money(totales.descuento)}</strong>
              </div>
              <div className={styles.resumenFila}>
                <span>ISV</span>
                <strong>{money(totales.impuesto)}</strong>
              </div>
              <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
                <span>Total</span>
                <strong>{money(totales.total)}</strong>
              </div>

              <button
                type="submit"
                className={adminStyles.primaryBtn}
                disabled={guardando || !clienteId || !lineasValidas}
              >
                <Receipt size={16} /> {guardando ? "Emitiendo…" : "Emitir factura"}
              </button>
              <p className={adminStyles.fieldHint}>
                Se guarda la huella del documento y se descuenta inventario. Si el
                stock no alcanza, la factura no se emite.
              </p>
            </section>
          </form>
        )}

        {tab === "libro" && (
          <>
            <div className={adminStyles.toolbar}>
              <label className={styles.fechaCampo}>
                Desde
                <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              </label>
              <label className={styles.fechaCampo}>
                Hasta
                <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
              </label>
              <button type="button" className={adminStyles.ghostBtn} onClick={cargarLibro}>
                <RefreshCw size={15} /> Generar
              </button>
              <a
                className={adminStyles.ghostBtn}
                href={`/api/facturacion/libro-ventas?desde=${desde}&hasta=${hasta}&formato=csv`}
              >
                <Download size={14} /> CSV
              </a>
              <a
                className={adminStyles.ghostBtn}
                href={`/api/facturacion/libro-ventas?desde=${desde}&hasta=${hasta}&formato=xlsx`}
              >
                <Download size={14} /> Excel
              </a>
            </div>

            <section className={adminStyles.stats} aria-label="Totales del libro de ventas">
              <article className={adminStyles.statCard}>
                <span className={adminStyles.statIcon}><Receipt size={18} /></span>
                <strong className={adminStyles.statValue}>{libro?.documentos?.length || 0}</strong>
                <span className={adminStyles.statLabel}>Facturas</span>
              </article>
              <article className={adminStyles.statCard}>
                <span className={adminStyles.statIcon}><FileText size={18} /></span>
                <strong className={adminStyles.statValue}>{money(libro?.totales?.subtotal || 0)}</strong>
                <span className={adminStyles.statLabel}>Subtotal</span>
              </article>
              <article className={adminStyles.statCard}>
                <span className={adminStyles.statIcon}><FileText size={18} /></span>
                <strong className={adminStyles.statValue}>{money(libro?.totales?.impuesto || 0)}</strong>
                <span className={adminStyles.statLabel}>ISV</span>
              </article>
              <article className={adminStyles.statCard}>
                <span className={adminStyles.statIcon}><Receipt size={18} /></span>
                <strong className={adminStyles.statValue}>{money(libro?.totales?.total || 0)}</strong>
                <span className={adminStyles.statLabel}>Total vendido</span>
              </article>
            </section>

            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Subtotal</th>
                    <th>ISV</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(libro?.documentos || []).map((doc) => (
                    <tr key={doc.id}>
                      <td data-label="Fecha">{formatFecha(doc.fecha)}</td>
                      <td data-label="Número">{doc.correlativo || "Pendiente de CAI"}</td>
                      <td data-label="Cliente">{doc.cliente || "—"}</td>
                      <td data-label="Subtotal">{money(doc.subtotal)}</td>
                      <td data-label="ISV">{money(doc.impuesto)}</td>
                      <td data-label="Total"><strong>{money(doc.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {libro && !libro.documentos?.length ? (
                <div className={adminStyles.empty}>
                  <span className={adminStyles.emptyIcon}><BookOpen size={22} /></span>
                  <p className={adminStyles.emptyText}>No hay facturas emitidas en ese rango de fechas.</p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {tab === "config" && (
          <section className={adminStyles.card}>
            <header className={adminStyles.cardHeader}>
              <div>
                <p className={adminStyles.eyebrow}>SENAT</p>
                <h3>Rango autorizado y datos del emisor</h3>
              </div>
            </header>
            <form className={`${adminStyles.form} ${adminStyles.cardBody}`} onSubmit={guardarConfig}>
              <div className={adminStyles.fieldGrid}>
                <label className={adminStyles.field}>
                  CAI
                  <input
                    type="text"
                    value={configDraft.cai}
                    onChange={(event) => setConfigDraft({ ...configDraft, cai: event.target.value })}
                    placeholder="XXXXXXXX-XXXXXX-XXXXXXXX-XXXXXXXX"
                  />
                </label>
                <label className={adminStyles.field}>
                  Serie / establecimiento
                  <input
                    type="text"
                    value={configDraft.serie}
                    onChange={(event) => setConfigDraft({ ...configDraft, serie: event.target.value })}
                    placeholder="001-001-01"
                  />
                </label>
                <label className={adminStyles.field}>
                  Próximo correlativo
                  <input
                    type="number"
                    min="1"
                    value={configDraft.correlativo}
                    onChange={(event) => setConfigDraft({ ...configDraft, correlativo: event.target.value })}
                    placeholder="1"
                  />
                  <small className={adminStyles.fieldHint}>
                    Solo se usa si CAI y serie están configurados. No lo reinicies sin autorización.
                  </small>
                </label>
                <label className={adminStyles.field}>
                  RTN del emisor
                  <input
                    type="text"
                    value={configDraft.nit}
                    onChange={(event) => setConfigDraft({ ...configDraft, nit: event.target.value })}
                  />
                </label>
                <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                  Razón social
                  <input
                    type="text"
                    value={configDraft.nombre}
                    onChange={(event) => setConfigDraft({ ...configDraft, nombre: event.target.value })}
                    placeholder="Arconet, S.A."
                  />
                </label>
                <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                  Dirección fiscal
                  <input
                    type="text"
                    value={configDraft.direccion}
                    onChange={(event) => setConfigDraft({ ...configDraft, direccion: event.target.value })}
                  />
                </label>
              </div>

              <div className={adminStyles.modalActions}>
                <button type="submit" className={adminStyles.primaryBtn} disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar configuración"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      {detalle ? (
        <div
          className={adminStyles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetalle(null);
          }}
        >
          <div className={adminStyles.modal} role="dialog" aria-modal="true" aria-label="Detalle de la factura">
            <header className={adminStyles.modalHead}>
              <div>
                <p className={adminStyles.eyebrow}>{TIPO_LABEL[detalle.tipo] || detalle.tipo}</p>
                <h2>{detalle.correlativo || "Pendiente de CAI"}</h2>
              </div>
              <button type="button" className={adminStyles.iconBtn} onClick={() => setDetalle(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.detalleBody}>
              <div className={styles.detalleMeta}>
                <span>Cliente</span>
                <strong>{detalle.cliente?.nombre || "—"}</strong>
                <span>Fecha</span>
                <strong>{formatFecha(detalle.fecha)}</strong>
                <span>Estado</span>
                <strong>{detalle.estado === "anulado" ? "Anulada" : "Emitida"}</strong>
                {detalle.motivoAnulacion ? (
                  <>
                    <span>Motivo</span>
                    <strong>{detalle.motivoAnulacion}</strong>
                  </>
                ) : null}
              </div>

              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>ISV</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.items || []).map((item) => (
                    <tr key={item.id}>
                      <td data-label="Descripción">{item.descripcion}</td>
                      <td data-label="Cant.">{Number(item.cantidad)}</td>
                      <td data-label="Precio">{money(item.precio)}</td>
                      <td data-label="ISV">{Number(item.impuestoPorcentaje)}%</td>
                      <td data-label="Subtotal">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.resumen}>
                <div className={styles.resumenFila}><span>Subtotal</span><strong>{money(detalle.subtotal)}</strong></div>
                <div className={styles.resumenFila}><span>Descuento</span><strong>− {money(detalle.descuento)}</strong></div>
                <div className={styles.resumenFila}><span>ISV</span><strong>{money(detalle.impuesto)}</strong></div>
                <div className={`${styles.resumenFila} ${styles.resumenTotal}`}><span>Total</span><strong>{money(detalle.total)}</strong></div>
              </div>

              {detalle.pdfHash ? (
                <p className={styles.hash}>Huella SHA-256: <code>{detalle.pdfHash}</code></p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
