"use client";

import PrecioSelector from "./precio-selector";
import ClienteSelector from "./cliente-selector";
import ReferenciaSelector from "./referencia-selector";
import { fiscalPreviewTotals, validCommercialLine, MAX_DOCUMENT_AMOUNT } from "@/lib/ventas-form";
import salesStyles from "./ventas-form.module.css";
import { priceAt } from "@/lib/precios";
import { previewDocumentClick } from "@/lib/api-document";
import { resolveFiscalTab } from "@/lib/admin-navigation";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  { id: "libro", label: "Libro de ventas", icon: BookOpen, title: "Libro de ventas por rango" },
  { id: "config", label: "Configuración", icon: Settings2, title: "CAI, serie y datos fiscales" },
];

// Las píldoras comerciales pertenecen al padre; las fiscales son locales.
const SALES_TABS = new Set(["precios", "facturas", "cotizaciones", "ventas", "pendientes", "aprobadas", "completadas", "todas"]);

const IMPUESTOS = [
  { value: "15", label: "ISV 15%" },
  { value: "18", label: "ISV 18%" },
  { value: "0", label: "Exento" },
];

const TIPO_LABEL = { factura: "Factura", nota_credito: "Nota de crédito", nota_debito: "Nota de débito" };

let lineaSeq = 0;
function nuevaLinea(impuesto = 15, kind = "producto") {
  lineaSeq += 1;
  return {
    key: `linea-${lineaSeq}`,
    kind,
    productoId: "",
    nivelPrecio: "normal",
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

export default function FacturacionPanel({ session, productos: productosIniciales = [], hideTopbar = false, chromeOnly = false, tabs, activeTab: controlledTab, onTabChange, onClientCreated, saleEditorOpen, onSaleEditorClose }) {
  const [innerTab, setInnerTab] = useState("documentos");
  // Las píldoras fiscales mantienen su selección aunque Ventas siga en «Facturas».
  const tab = resolveFiscalTab(controlledTab, innerTab);
  // «nueva» sólo se conserva como selección programática legada; no es una
  // pestaña ni una entrada de creación dentro del registro de Facturas.
  const editorOpen = saleEditorOpen ?? (tab === "nueva");
  const closeEditor = () => { setInnerTab("documentos"); onSaleEditorClose?.(); };
  const canWrite = session?.permisos?.includes("facturacion:write");
  const canRead = session?.permisos?.includes("facturacion:read");

  const [documentos, setDocumentos] = useState([]);
  const [productos, setProductos] = useState(productosIniciales);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const [clienteId, setClienteId] = useState("");
  const [clientSnapshot, setClientSnapshot] = useState(null);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientCreating, setClientCreating] = useState(false);
  const submitting = useRef(false);
  const [impuesto, setImpuesto] = useState(15);
  const [lineas, setLineas] = useState([]);

  const [libro, setLibro] = useState(null);
  const [desde, setDesde] = useState(inicioMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [configDraft, setConfigDraft] = useState({ cai: "", serie: "", correlativo: "", nit: "", nombre: "", direccion: "" });

  const setTab = (next) => {
    if (guardando || clientBusy) return;
    if (TABS.some(item => item.id === next)) {
      if (editorOpen) onSaleEditorClose?.();
      setInnerTab(next);
      if (TABS.some(item => item.id === controlledTab)) onTabChange?.(next);
      return;
    }
    if (SALES_TABS.has(next)) onTabChange?.(next);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, cfg] = await Promise.all([
        canRead ? request("/api/facturacion/documentos") : Promise.resolve([]),
        canRead ? request("/api/facturacion/config") : Promise.resolve(null),
      ]);
      setDocumentos(Array.isArray(docs) ? docs : []);
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
  }, [canRead]);

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

  const totales = useMemo(() => fiscalPreviewTotals(lineas), [lineas]);

  const lineasValidas = totales.total <= MAX_DOCUMENT_AMOUNT && lineas.length > 0 && lineas.every(linea =>
    validCommercialLine({ ...linea, nombre: linea.descripcion }) &&
    Number.isFinite(Number(linea.descuento)) && Number(linea.descuento) >= 0 &&
    Number(linea.descuento) <= Number(linea.cantidad) * Number(linea.precio)
  );

  function rememberProduct(product) {
    setProductos(current => [product, ...current.filter(item => item.id !== product.id)]);
  }

  function selectClient(client) {
    setClienteId(client?.id || "");
    setClientSnapshot(client);
  }

  function cambiarLinea(key, campo, valor) {
    setLineas((current) =>
      current.map((linea) => {
        if (linea.key !== key) return linea;
        if (campo === "nivelPrecio") return { ...linea, nivelPrecio: valor, precio: String(priceAt(productos.find(item => item.id === linea.productoId), valor) ?? "") };
        return { ...linea, [campo]: valor };
      }),
    );
  }

  function elegirProducto(key, producto) {
    if (producto) rememberProduct(producto);
    setLineas((current) =>
      current.map((linea) =>
        linea.key === key
          ? {
              ...linea,
              productoId: producto?.id || "",
              nivelPrecio: "normal",
              descuento: "",
              descripcion: producto ? producto.nombre : "",
              precio: producto ? String(producto.precio) : "",
            }
          : linea,
      ),
    );
  }

  function agregarLinea(kind) {
    const line = nuevaLinea(impuesto, kind);
    setLineas(current => current.length >= 100 ? current : [...current, line]);
  }

  function quitarLinea(key) {
    setLineas(current => current.filter(linea => linea.key !== key));
  }

  async function emitir(event) {
    event.preventDefault();
    if (!canWrite || submitting.current || clientBusy || clientCreating) return;
    if (!clienteId) {
      sileo.error({ title: "Selecciona un cliente" });
      return;
    }
    if (!lineasValidas) {
      sileo.error({ title: "Revisa las líneas", description: "Cada línea necesita descripción, cantidad y precio." });
      return;
    }
    submitting.current = true;
    setGuardando(true);
    try {
      const payload = {
        tipo: "factura",
        clienteId,
        impuestoPorcentaje: impuesto,
        items: lineas.map((linea) => ({
          ...(linea.productoId ? { productoId: linea.productoId, nivelPrecio: linea.nivelPrecio } : {}),
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
      setLineas([]);
      await cargar();
      setInnerTab("documentos");
      onSaleEditorClose?.();
    } catch (err) {
      sileo.error({
        title: "No se pudo emitir la factura",
        description: err.message,
        duration: 8000,
      });
    } finally {
      submitting.current = false;
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
    if (!canWrite || submitting.current || clientBusy || clientCreating) return;
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
          title={editorOpen ? "Nueva venta · Factura fiscal" : "Facturas"}
          subtitle="Consulta y gestiona las facturas emitidas, el libro de ventas y la configuración fiscal. Crea desde Nueva venta."
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
              <h1>{editorOpen ? "Nueva venta · Factura fiscal" : "Ventas · Facturas"}</h1>
              <p>{editorOpen ? "Registra esta venta una sola vez con su comprobante fiscal. No necesitas crear antes una venta comercial." : "Consulta y gestiona las facturas emitidas, el libro de ventas y la configuración fiscal. Crea desde Nueva venta."}</p>
            </div>
            <div className={adminStyles.topbarActions}>
              <button type="button" className={adminStyles.ghostBtn} onClick={cargar}>
                <RefreshCw size={15} /> Actualizar
              </button>
            </div>
          </div>
        )}

        <SectionTabs tabs={TABS} activeTab={editorOpen ? "" : tab} onTabChange={setTab} label="Secciones de facturación" />

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {sinRango ? (
          <div className={styles.warning} role="status">
            <AlertTriangle size={16} />
            <p>
              Aún no has configurado tu rango autorizado (CAI, serie y
              correlativo). Las emisiones sin rango quedan <strong>pendientes de CAI</strong>,
              sin numeración ni validez fiscal. Configurar el rango no numera
              retroactivamente los documentos anteriores. Revisa la autorización antes de emitir:{" "}
              <button
                type="button"
                className={styles.inlineLinkBtn}
                onClick={() => setTab("config")}
              >
                Ir a Configuración →
              </button>
            </p>
          </div>
        ) : null}

        {!editorOpen && tab === "documentos" && (
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
                            href={`/api/facturacion/documentos/${encodeURIComponent(doc.id)}/pdf`}
                            data-no-transition="true"
                            onClick={event => previewDocumentClick(event, "admin")?.catch(error => sileo.error({ title: error.message }))}
                            rel="noopener noreferrer"
                          >
                            <Download size={14} /> Imprimir
                          </a>
                          {canWrite && doc.estado !== "anulado" ? (
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

        <div hidden={!editorOpen}>
          <button type="button" className={adminStyles.ghostBtn} disabled={guardando || clientBusy} onClick={closeEditor}>Volver a Facturas · conservar borrador</button>
          <form onSubmit={emitir}>
            <fieldset className={styles.invoiceGrid} disabled={guardando || !canWrite} aria-label="Nueva venta · Factura fiscal">
              <section className={adminStyles.card}>
                <header className={adminStyles.cardHeader}>
                  <div>
                    <p className={adminStyles.eyebrow}>Datos</p>
                    <h3>Cliente e impuesto</h3>
                  </div>
                </header>
                <div className={`${adminStyles.form} ${adminStyles.cardBody}`}>
                  <ClienteSelector value={clienteId} fallback={clientSnapshot} onChange={selectClient} onCreated={onClientCreated} session={session} disabled={guardando || !canWrite} onBusyChange={setClientBusy} onModeChange={setClientCreating} />

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
                  <div className={salesStyles.actions}>
                    <button type="button" className={adminStyles.ghostBtn} onClick={() => agregarLinea("producto")} disabled={lineas.length >= 100}><Plus size={15} /> Añadir producto</button>
                    <button type="button" className={adminStyles.ghostBtn} onClick={() => agregarLinea("concepto")} disabled={lineas.length >= 100}><Plus size={15} /> Añadir concepto / servicio</button>
                  </div>
                </header>

                <div className={adminStyles.cardBody}>
                  {!lineas.length && <p className={salesStyles.hint}>Añade productos del catálogo o conceptos / servicios para calcular el total de la factura.</p>}
                  {lineas.map((linea) => {
                    const producto = productos.find((item) => item.id === linea.productoId);
                    return (
                      <div className={styles.linea} key={linea.key}>
                        <div className={styles.lineaTop}>
                          {linea.kind === "producto" ? <ReferenciaSelector kind="productos" label="Producto" value={linea.productoId} fallback={producto} onChange={product => elegirProducto(linea.key, product)} onResolved={rememberProduct} disabled={guardando || !canWrite} /> : <strong className={salesStyles.hint}>Concepto / servicio</strong>}
                          <button
                            type="button"
                            className={adminStyles.dangerBtn}
                            onClick={() => quitarLinea(linea.key)}
                            aria-label="Quitar línea"
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

                        {linea.productoId && <label className={adminStyles.field}>Tarifa de venta<PrecioSelector product={producto} value={linea.nivelPrecio} onChange={value => cambiarLinea(linea.key, "nivelPrecio", value)} label="Tarifa de venta" disabled={guardando || !canWrite} /></label>}
                        <div className={styles.lineaGrid}>
                          <label className={adminStyles.field}>
                            Cantidad
                            <input
                              type="number"
                              min={linea.kind === "producto" ? "1" : "0.001"}
                              step={linea.kind === "producto" ? "1" : "0.001"}
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
                              readOnly={Boolean(linea.productoId)}
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
                              disabled={Boolean(linea.productoId) && !session?.permisos?.includes("precios:write")}
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

                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={styles.resumen}>
                <div className={styles.resumenFila}>
                  <span>Subtotal neto</span>
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

                {totales.total > MAX_DOCUMENT_AMOUNT && <p className={salesStyles.error} role="alert">El total supera el importe máximo permitido. Reduce cantidades o precios.</p>}
                <button
                  type="submit"
                  className={adminStyles.primaryBtn}
                  disabled={!canWrite || guardando || clientBusy || clientCreating || !clienteId || !lineasValidas}
                >
                  <Receipt size={16} /> {guardando ? "Emitiendo…" : "Emitir factura"}
                </button>
                <p className={adminStyles.fieldHint}>
                  Se guarda la huella del documento y se descuenta inventario. Si el
                  stock no alcanza, la factura no se emite.
                </p>
              </section>
            </fieldset>
          </form>
        </div>

        {!editorOpen && tab === "libro" && (
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
                data-no-transition="true"
                onClick={event => previewDocumentClick(event, "admin")?.catch(error => sileo.error({ title: error.message }))}
              >
                <Download size={14} /> CSV
              </a>
              <a
                className={adminStyles.ghostBtn}
                href={`/api/facturacion/libro-ventas?desde=${desde}&hasta=${hasta}&formato=xlsx`}
                data-no-transition="true"
                onClick={event => previewDocumentClick(event, "admin")?.catch(error => sileo.error({ title: error.message }))}
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

        {!editorOpen && tab === "config" && (
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
                    disabled={!canWrite} value={configDraft.cai}
                    onChange={(event) => setConfigDraft({ ...configDraft, cai: event.target.value })}
                    placeholder="XXXXXXXX-XXXXXX-XXXXXXXX-XXXXXXXX"
                  />
                </label>
                <label className={adminStyles.field}>
                  Serie / establecimiento
                  <input
                    type="text"
                    disabled={!canWrite} value={configDraft.serie}
                    onChange={(event) => setConfigDraft({ ...configDraft, serie: event.target.value })}
                    placeholder="001-001-01"
                  />
                </label>
                <label className={adminStyles.field}>
                  Próximo correlativo
                  <input
                    type="number"
                    min="1"
                    disabled={!canWrite} value={configDraft.correlativo}
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
                    disabled={!canWrite} value={configDraft.nit}
                    onChange={(event) => setConfigDraft({ ...configDraft, nit: event.target.value })}
                  />
                </label>
                <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                  Razón social
                  <input
                    type="text"
                    disabled={!canWrite} value={configDraft.nombre}
                    onChange={(event) => setConfigDraft({ ...configDraft, nombre: event.target.value })}
                    placeholder="Arconet, S.A."
                  />
                </label>
                <label className={`${adminStyles.field} ${adminStyles.spanFull}`}>
                  Dirección fiscal
                  <input
                    type="text"
                    disabled={!canWrite} value={configDraft.direccion}
                    onChange={(event) => setConfigDraft({ ...configDraft, direccion: event.target.value })}
                  />
                </label>
              </div>

              <div className={adminStyles.modalActions}>
                <button type="submit" className={adminStyles.primaryBtn} disabled={!canWrite || guardando}>
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
                <div className={styles.resumenFila}><span>Subtotal neto</span><strong>{money(detalle.subtotal)}</strong></div>
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
