"use client";

import PrecioSelector from "./precio-selector";
import ClienteSelector from "./cliente-selector";
import ReferenciaSelector from "./referencia-selector";
import { fiscalPreviewTotals, MAX_DOCUMENT_AMOUNT } from "@/lib/ventas-form";
import salesStyles from "./ventas-form.module.css";
import { priceAt } from "@/lib/precios";
import { previewDocumentClick } from "@/lib/api-document";
import { resolveFiscalTab } from "@/lib/admin-navigation";
import { canEmitFiscalSale } from "@/lib/permisos";
import { invoiceIssues } from "@/lib/invoice-feedback";
import BusinessNotice from "./business-notice";
import feedbackStyles from "./business-feedback.module.css";
import { AdminContext } from "./admin-nav";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Download,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { sileo } from "../toaster";
import { SectionTabs, Topbar } from "./topbar";
import adminStyles from "./admin-experience.module.css";
import { DialogBackdrop } from "./admin-overlay";
import styles from "./facturacion-panel.module.css";

const TABS = [
  { id: "documentos", label: "Documentos", icon: Receipt, title: "Facturas emitidas" },
  { id: "libro", label: "Libro de ventas", icon: BookOpen, title: "Libro de ventas por rango" },
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      cache: "no-store", ...options, signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || "No se pudo completar la operación."), { httpStatus: response.status, code: data.code, documentoId: data.documentoId });
    return data;
  } finally { clearTimeout(timer); }
}

export default function FacturacionPanel({ session, productos: productosIniciales = [], hideTopbar = false, chromeOnly = false, tabs, activeTab: controlledTab, onTabChange, onClientCreated, saleEditorOpen, onSaleEditorClose, embedded = false, editorRef, detailOnly = false, onDocumentsChange, onStatusChange, onInventoryChanged, onDocumentSaved, onInspectDocument, draftMemory }) {
  const adminContext = useContext(AdminContext);
  const [initialDraft] = useState(() => draftMemory?.read() || null);
  const emissionKey = useRef(initialDraft?.emissionKey || null);
  const [feedback, setFeedback] = useState(null);
  const [hasAttempt, setHasAttempt] = useState(Boolean(initialDraft?.emissionKey));
  const [innerTab, setInnerTab] = useState("documentos");
  // Las píldoras fiscales mantienen su selección aunque Ventas siga en «Facturas».
  const tab = resolveFiscalTab(controlledTab, innerTab);
  // «nueva» sólo se conserva como selección programática legada; no es una
  // pestaña ni una entrada de creación dentro del registro de Facturas.
  const editorOpen = saleEditorOpen ?? (tab === "nueva");
  const closeEditor = () => { setInnerTab("documentos"); onSaleEditorClose?.(); };
  const canWrite = session?.permisos?.includes("facturacion:write");
  const canRead = session?.permisos?.includes("facturacion:read");
  const canEmit = canEmitFiscalSale(session?.permisos);

  const [documentos, setDocumentos] = useState([]);
  const [productos, setProductos] = useState(productosIniciales);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const [clienteId, setClienteId] = useState(initialDraft?.clienteId || "");
  const [clientSnapshot, setClientSnapshot] = useState(initialDraft?.clientSnapshot || null);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientCreating, setClientCreating] = useState(false);
  const submitting = useRef(false);
  const [impuesto, setImpuesto] = useState(initialDraft?.impuesto ?? 15);
  const [lineas, setLineas] = useState(initialDraft?.lineas || []);

  const [libro, setLibro] = useState(null);
  const [desde, setDesde] = useState(inicioMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  useEffect(() => {
    draftMemory?.write({ clienteId, clientSnapshot, impuesto, lineas, emissionKey: emissionKey.current });
  }, [clienteId, clientSnapshot, impuesto, lineas, draftMemory]);
  function goSettings() {
    if (submitting.current || clientBusy) return;
    onSaleEditorClose?.();
    adminContext?.goTo?.("ajustes");
  }

  const setTab = (next) => {
    if (guardando || clientBusy) return;
    if (TABS.some(item => item.id === next)) {
      if (editorOpen && !embedded) onSaleEditorClose?.();
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
      const records = Array.isArray(docs) ? docs : [];
      setDocumentos(records);
      onDocumentsChange?.(records);
      setConfig(cfg || null);
      setError("");
      setFeedback(current => current?.validation ? null : current);
    } catch (err) {
      setError(err.message || "No se pudo cargar la facturación.");
    } finally {
      setLoading(false);
    }
  }, [canRead, onDocumentsChange, setDocumentos, setConfig, setError, setLoading, setFeedback]);

  useEffect(() => { onStatusChange?.({ loading, error }); }, [loading, error, onStatusChange]);

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

  const validationIssues = invoiceIssues({ canEmit, loading, loadError: error, clientBusy, clientCreating, clienteId, lineas, config, recovering: hasAttempt });
  const canReadSettings = session?.permisos?.includes("ajustes:read");
  function changedDraft() { setFeedback(null); }
  function focusFeedback() { requestAnimationFrame(() => document.getElementById("invoice-feedback")?.focus()); }

  function rememberProduct(product) {
    setProductos(current => [product, ...current.filter(item => item.id !== product.id)]);
  }

  function selectClient(client) {
    changedDraft();
    setClienteId(client?.id || "");
    setClientSnapshot(client);
  }

  function cambiarLinea(key, campo, valor) {
    changedDraft();
    setLineas((current) =>
      current.map((linea) => {
        if (linea.key !== key) return linea;
        if (campo === "nivelPrecio") return { ...linea, nivelPrecio: valor, precio: String(priceAt(productos.find(item => item.id === linea.productoId), valor) ?? "") };
        return { ...linea, [campo]: valor };
      }),
    );
  }

  function elegirProducto(key, producto) {
    changedDraft();
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
    changedDraft();
    const line = nuevaLinea(impuesto, kind);
    setLineas(current => current.length >= 100 ? current : [...current, line]);
  }

  function discardDraft() {
    if (submitting.current || clientBusy) return;
    if (!window.confirm("¿Descartar este borrador? Si hubo un error de conexión, verifica primero si el documento ya se guardó.")) return;
    emissionKey.current = null;setHasAttempt(false);setLineas([]);setClienteId("");setClientSnapshot(null);setFeedback({ kind: "info", title: "Borrador descartado", message: "Puedes preparar una nueva venta. No se borró ni anuló ningún documento guardado." });
  }

  function quitarLinea(key) {
    changedDraft();
    setLineas(current => current.filter(linea => linea.key !== key));
  }

  async function syncInventory(documento) {
    if (!onInventoryChanged || !documento?.items?.some(item => item.productoId)) return;
    try {
      await onInventoryChanged();
    } catch {
      // El documento ya se guardó: un fallo de refresco nunca debe presentarse
      // como un fallo de emisión ni invitar a registrar la venta otra vez.
      sileo.warning({ title: "Documento guardado", description: "No se pudo refrescar el catálogo. Recarga para consultar las existencias actuales; no repitas la operación." });
    }
  }

  async function emitir(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (validationIssues.length) {
      setFeedback({ kind: "error", title: "Revisa estos datos antes de enviar", issues: validationIssues, validation: true });
      focusFeedback(); return;
    }
    if (!emissionKey.current) {
      try { emissionKey.current = crypto.randomUUID(); }
      catch { setFeedback({ kind: "error", title: "No se pudo preparar el envío", message: "Este navegador no pudo crear una referencia segura del borrador. Usa HTTPS y recarga sin reenviar una operación anterior." });focusFeedback();return; }
    }
    draftMemory?.write({ clienteId, clientSnapshot, impuesto, lineas, emissionKey: emissionKey.current });
    setHasAttempt(true);
    setFeedback({ kind: "pending", title: "Guardando la venta…", message: "Se está validando y guardando una sola operación. No vuelvas a enviarla ni cierres este diálogo." });
    submitting.current = true;
    setGuardando(true);
    try {
      const payload = {
        tipo: "factura", emissionKey: emissionKey.current,
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
      const savedMessage = data.replayed ? "Se recuperó el documento ya guardado; no se creó otra factura ni se descontó stock de nuevo." : data.tieneRango ? `Factura ${doc.correlativo} guardada. Total ${money(doc.total)}.` : `Venta guardada por ${money(doc.total)}, pendiente de CAI y sin validez fiscal.`;
      setFeedback({ kind: "success", title: "Documento guardado", message: savedMessage });
      onDocumentSaved?.(data);
      sileo.success({ title: "Documento guardado", description: savedMessage, duration: 7000 });
      emissionKey.current = null;setHasAttempt(false);
      const records = [doc, ...documentos.filter(record => record.id !== doc.id)].slice(0, 100);
      setDocumentos(records);
      onDocumentsChange?.(records);
      setLineas([]);
      await cargar();
      await syncInventory(doc);
      setInnerTab("documentos");
      onSaleEditorClose?.();
    } catch (err) {
      setFeedback({ kind: "error", title: err.httpStatus ? "No se pudo guardar la factura" : "No se pudo confirmar el guardado", message: err.httpStatus ? err.message : "La conexión no permitió confirmar la respuesta. El borrador conserva su referencia: reintentar el mismo borrador no genera otra factura. Consulta los documentos guardados si tienes dudas.", documentoId: err.documentoId });
      focusFeedback();
    } finally {
      submitting.current = false;
      setGuardando(false);
    }
  }

  async function anular(documento) {
    if (!canWrite || !canRead || submitting.current || guardando) return;
    const motivo = window.prompt(
      `Motivo de anulación de ${documento.correlativo || "la factura"}:`,
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      sileo.error({ title: "La anulación requiere un motivo" });
      return;
    }
    submitting.current = true;
    setGuardando(true);
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
      await syncInventory(documento);
    } catch (err) {
      sileo.error({ title: "No se pudo anular", description: err.message });
    } finally {
      submitting.current = false;
      setGuardando(false);
    }
  }

  useImperativeHandle(editorRef, () => ({
    canClose: () => !submitting.current && !guardando && !clientBusy,
    openDetail: documento => setDetalle(documento),
    annul: anular,
    refresh: cargar,
    refreshProduct: product => {
      if (!product?.id) return;
      rememberProduct(product);
      // Sólo el borrador sin emitir: los documentos guardados nunca se tocan.
      setLineas(current => current.map(line => line.productoId !== product.id ? line : {
        ...line, precio: priceAt(product, line.nivelPrecio) == null ? "" : String(priceAt(product, line.nivelPrecio)),
      }));
    },
  }));

  const detailContent = detalle ? (<div className={styles.detalleBody}>
              <div className={styles.detalleMeta}>
                <span>Número / referencia</span>
                <strong>{detalle.correlativo || `Pendiente de CAI · ${detalle.id}`}</strong>
                <span>RTN del cliente</span>
                <strong>{detalle.cliente?.rtn || "No registrado"}</strong>
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
            </div>) : null;


  return (
    <div className={embedded ? styles.embedded : undefined}>
      {!hideTopbar && (
        <Topbar
          chromeOnly={chromeOnly}
          title={editorOpen ? "Nueva venta · Factura fiscal" : "Facturas"}
          subtitle="Consulta documentos y libro de ventas. La configuración empresarial está centralizada en Ajustes."
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
              <p>{editorOpen ? "Registra esta venta una sola vez con su comprobante fiscal. No necesitas crear antes una venta comercial." : "Consulta documentos y libro de ventas. La configuración empresarial está centralizada en Ajustes."}</p>
            </div>
            <div className={adminStyles.topbarActions}>
              <button type="button" className={adminStyles.ghostBtn} onClick={cargar}>
                <RefreshCw size={15} /> Actualizar
              </button>
            </div>
          </div>
        )}

        {!embedded && <SectionTabs tabs={TABS} activeTab={editorOpen ? "" : tab} onTabChange={setTab} label="Secciones de facturación" />}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {!detailOnly && !loading && config && <BusinessNotice kind={config.state === "ready" ? "success" : config.canIssue === false ? "error" : "warning"} title={config.state === "ready" ? "Autorización fiscal preparada" : config.pending ? "Venta pendiente de autorización fiscal" : "Revisa la autorización antes de emitir"} issues={config.issues || []}>
          {canReadSettings ? <button type="button" className={adminStyles.ghostBtn} disabled={guardando || clientBusy} onClick={goSettings}>Ir a Ajustes de empresa</button> : <p>Si hace falta autorización, solicita a Administración revisar Ajustes. Este diálogo no modifica CAI ni numeración.</p>}
        </BusinessNotice>}

        {!embedded && !editorOpen && tab === "documentos" && (
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
          {!embedded && <button type="button" className={adminStyles.ghostBtn} disabled={guardando || clientBusy} onClick={closeEditor}>Cerrar · conservar borrador</button>}
          <form onSubmit={emitir} noValidate>
            <div className={feedbackStyles.editorStatus}>
              {feedback ? <BusinessNotice id="invoice-feedback" {...feedback}>
                {feedback.documentoId && <button type="button" className={adminStyles.ghostBtn} onClick={async () => { try { const doc = await request(`/api/facturacion/documentos/${encodeURIComponent(feedback.documentoId)}`);if (onInspectDocument) onInspectDocument(doc);else setDetalle(doc); } catch (err) { setFeedback({ kind: "error", title: "No se pudo consultar el documento", message: err.message }); } }}>Ver documento ya guardado</button>}
              </BusinessNotice> : <BusinessNotice id="invoice-feedback" kind={validationIssues.length ? "info" : config?.pending || (hasAttempt && config?.canIssue === false) ? "warning" : "success"} title={validationIssues.length ? "Falta completar la venta" : hasAttempt && config?.canIssue === false ? "Verificar el envío anterior" : config?.pending ? "Preparado para guardar pendiente de CAI" : "Preparado para enviar la factura"} issues={validationIssues} message={validationIssues.length ? undefined : hasAttempt && config?.canIssue === false ? "Se puede recuperar un documento ya guardado con esta referencia; no se emitirá uno nuevo sin autorización vigente." : "El servidor validará autorización, precios y existencias antes de confirmar el guardado."} />}
              {error && <button type="button" className={adminStyles.ghostBtn} disabled={loading} onClick={cargar}>Reintentar carga fiscal · conservar borrador</button>}
            </div>
            <fieldset className={styles.invoiceGrid} disabled={guardando || !canEmit} aria-label="Nueva venta · Factura fiscal">
              <section className={adminStyles.card}>
                <header className={adminStyles.cardHeader}>
                  <div>
                    <p className={adminStyles.eyebrow}>Datos</p>
                    <h3>Cliente e impuesto</h3>
                  </div>
                </header>
                <div className={`${adminStyles.form} ${adminStyles.cardBody}`}>
                  <ClienteSelector value={clienteId} fallback={clientSnapshot} onChange={selectClient} onCreated={onClientCreated} session={session} disabled={guardando || !canEmit} onBusyChange={setClientBusy} onModeChange={setClientCreating} />

                  <label className={adminStyles.field}>
                    Impuesto por defecto
                    <select
                      value={String(impuesto)}
                      onChange={(event) => {
                        changedDraft();
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
                  {lineas.map((linea, index) => {
                    const producto = productos.find((item) => item.id === linea.productoId);
                    return (
                      <div className={styles.linea} key={linea.key} role="group" aria-label={`Línea ${index + 1}`}>
                        <div className={styles.lineaTop}>
                          {linea.kind === "producto" ? <ReferenciaSelector kind="productos" label="Producto" value={linea.productoId} fallback={producto} onChange={product => elegirProducto(linea.key, product)} onResolved={rememberProduct} disabled={guardando || !canEmit} /> : <strong className={salesStyles.hint}>Concepto / servicio</strong>}
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

                        {linea.productoId && <label className={adminStyles.field}>Tarifa de venta<PrecioSelector product={producto} value={linea.nivelPrecio} onChange={value => cambiarLinea(linea.key, "nivelPrecio", value)} label="Tarifa de venta" disabled={guardando || !canEmit} /></label>}
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
                  <output aria-label="Total de la venta" aria-live="polite">{money(totales.total)}</output>
                </div>

                {totales.total > MAX_DOCUMENT_AMOUNT && <p className={salesStyles.error} role="alert">El total supera el importe máximo permitido. Reduce cantidades o precios.</p>}
                <button
                  type="submit"
                  className={adminStyles.primaryBtn}
                  disabled={!canEmit || loading || guardando}
                >
                  <Receipt size={16} /> {guardando ? "Guardando venta…" : hasAttempt && config?.canIssue === false ? "Verificar envío anterior" : config?.pending ? "Guardar venta pendiente de CAI" : "Emitir factura"}
                </button>
                <p className={adminStyles.fieldHint}>
                  Se guarda la huella del documento y se descuenta inventario. Si el
                  stock no alcanza, la factura no se emite.
                </p>
                <button type="button" className={adminStyles.ghostBtn} disabled={guardando || clientBusy} onClick={discardDraft}>Descartar borrador</button>
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

        {!editorOpen && tab === "config" && <BusinessNotice title="La configuración empresarial se trasladó a Ajustes" message="CAI, serie, rango, vigencia y datos del emisor se gestionan exclusivamente en Ajustes de empresa.">
          {canReadSettings && <button type="button" className={adminStyles.ghostBtn} onClick={goSettings}>Ir a Ajustes de empresa</button>}
        </BusinessNotice>}
      </div>

      {embedded && detailOnly ? detailContent : null}
      {detalle && !embedded ? (
        <DialogBackdrop className={`${adminStyles.overlay} ${adminStyles.centeredOverlay}`} onDismiss={() => setDetalle(null)}>
          <div className={`${adminStyles.modal} ${adminStyles.modalWide}`} data-drag-scroll="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label="Detalle de la factura">
            <header className={adminStyles.modalHead}>
              <div>
                <p className={adminStyles.eyebrow}>{TIPO_LABEL[detalle.tipo] || detalle.tipo}</p>
                <h2>{detalle.correlativo || "Pendiente de CAI"}</h2>
              </div>
              <button type="button" className={adminStyles.iconBtn} onClick={() => setDetalle(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            {detailContent}
          </div>
        </DialogBackdrop>
      ) : null}
    </div>
  );
}
