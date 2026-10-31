"use client";

import { salesDocuments, salesSummary, fiscalTypeLabel } from "@/lib/sales-documents";
import { priceAt } from "@/lib/precios";
import { localCalendarDate } from "@/lib/calendar-date";
import PrecioSelector from "./precio-selector";
import ClienteSelector from "./cliente-selector";
import ReferenciaSelector from "./referencia-selector";
import salesStyles from "./ventas-form.module.css";
import { commercialTotal, sameCommercialAmounts, validCommercialLine, MAX_DOCUMENT_AMOUNT } from "@/lib/ventas-form";
import { openApiDocument } from "@/lib/api-document";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Eye, FileText, Pencil, Plus, Printer, Search, Trash2, TrendingUp, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast, notifyError, ConfirmDialog } from "./admin-ui";
import {
  createOrder,
  deleteOrder,
  newOrderId,
  updateOrder,
  ORDER_STATUSES,
  ORDER_TYPES,
  orderStatusLabel,
  orderTypeLabel,
  formatOrderDate,
} from "./orders-store";
import { initialsCliente } from "./clientes-store";
import { formatPrice } from "./products-store";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { DialogBackdrop } from "./admin-overlay";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";

export default function CotizacionesSection({ orders = [], setOrders, clientes = [], setClientes, products = [], workers = [], session, hideTopbar = false, chromeOnly = false, hideCreateActions = false, editorRef, tabs, activeTab: controlledTab, onTabChange, headerActions, hideList = false, listNotice, fiscalDocuments = [], onFiscalDetail, onFiscalAnnul }) {
  const canWrite = session?.permisos?.includes("ordenes:write");
  const canAnnulFiscal = session?.permisos?.includes("facturacion:write");
  const documents = useMemo(() => salesDocuments(orders, fiscalDocuments), [orders, fiscalDocuments]);
  const canDelete = session?.permisos?.includes("ordenes:delete");
  const [innerTab, setInnerTab] = useState("todas");
  const activeTab = controlledTab ?? innerTab;
  // Pestana inicial "Todas": sin filtro de tipo (se ven cotizaciones y ventas).
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    id: "",
    tipo: "cotizacion",
    clienteId: "",
    cliente: "",
    fecha: localCalendarDate(),
    monto: "",
    estado: "pendiente",
    items: [],
    notas: "",
  });
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [clientCreating, setClientCreating] = useState(false);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientSnapshot, setClientSnapshot] = useState(null);
  const [catalog, setCatalog] = useState({});
  const lineSequence = useRef(0);
  const originalOrder = editingId ? orders.find(order => order.id === editingId) : null;
  const keepSavedAmount = Boolean(originalOrder && sameCommercialAmounts(originalOrder.items || [], draft.items));
  const total = keepSavedAmount ? Number(draft.monto) : commercialTotal(draft.items);
  const legacyHeaderOnly = Boolean(originalOrder && !originalOrder.items?.length && !draft.items.length && draft.tipo === originalOrder.tipo);
  const validLines = draft.items.length > 0 && draft.items.every(validCommercialLine) && total <= MAX_DOCUMENT_AMOUNT;
  const busy = saving || clientBusy;

  function catalogProduct(id) { return catalog[id] || products.find(product => product.id === id); }
  function rememberProduct(product) { setCatalog(current => ({ ...current, [product.id]: product })); }
  function selectClient(client) {
    setClientSnapshot(client);
    setDraft(current => ({ ...current, clienteId: client?.id || "", cliente: client?.nombre || "" }));
  }
  const { show } = useToast();

  // El buscador global de la cabecera delega aqui (ver ventas-section.js):
  // al pulsar Enter copia su termino al filtro de esta lista.
  useEffect(() => {
    const onGlobalSearch = (event) => setQuery(String(event.detail || ""));
    window.addEventListener("arconet:ventas-search", onGlobalSearch);
    return () => window.removeEventListener("arconet:ventas-search", onGlobalSearch);
  }, []);

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  // Normaliza texto para buscar sin distinguir mayusculas ni tildes
  // ("Jose" encuentra "José", "OPTICA" encuentra "óptica").
  const normalize = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Tokenizacion simple: cada palabra del query es un termino que debe
  // aparecer en algun campo del documento (busqueda tipo AND).
  const searchTerms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);

  const handleTabChange = useCallback((tabId) => {
    if (tabId === "precios") {
      onTabChange?.(tabId);
      return;
    }
    setInnerTab(tabId);
    onTabChange?.(tabId);
    if (tabId === "todas") {
      // Ambas fuentes se consultan en el mismo listado.
      setStatus("all");
      setType("all");
    } else if (tabId === "cotizaciones") {
      setStatus("all");
      setType("cotizacion");
    } else if (tabId === "ventas") {
      setStatus("all");
      setType("venta");
    } else if (tabId === "pendientes") {
      setStatus("pendiente");
      setType("all");
    } else if (tabId === "aprobadas") {
      setStatus("aprobada");
      setType("all");
    } else {
      setStatus("completada");
      setType("all");
    }
  }, [onTabChange]);

  const filtered = useMemo(() => {
    return documents.filter((order) => {
      if (status !== "all" && order.estado !== status) return false;
      if (type !== "all" && order.tipo !== type) return false;
      if (!searchTerms.length) return true;
      // Busqueda amplia: numero de orden, cliente guardado o escrito a mano,
      // RTN/correo/telefono del cliente, notas y productos de las lineas.
      const haystack = normalize([
        order.id,
        order.numero,
        order.cliente,
        order.notas,
        order.clienteObj?.nombre,
        order.clienteObj?.rtn,
        order.clienteObj?.correo,
        order.clienteObj?.contacto ?? order.clienteObj?.telefono,
        ...(order.items || []).map((item) => `${item.nombre ?? item.producto ?? ""} ${item.sku ?? ""}`),
      ].join(" "));
      return searchTerms.every((term) => haystack.includes(term));
    });
  }, [documents, searchTerms, status, type]);

  const stats = useMemo(() => salesSummary(documents), [documents]);

  const hasFilters = query.trim() !== "" || status !== "all" || type !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setType("all");
    setInnerTab("todas");
    onTabChange?.("todas");
  }

  const openCreate = useCallback((documentType = "cotizacion") => {
    if (documentType !== "cotizacion" || !canWrite || submitting.current || clientBusy) return;
    handleTabChange("cotizaciones");
    setDraft({
      id: newOrderId(),
      tipo: documentType,
      clienteId: "",
      cliente: "",
      fecha: localCalendarDate(),
      monto: "",
      estado: "pendiente",
      items: [],
      notas: "",
    });
    setEditingId(null);
    setClientCreating(false);
    setClientBusy(false);
    setClientSnapshot(null);
    setModalOpen(true);
  }, [canWrite, clientBusy, handleTabChange]);
  useImperativeHandle(editorRef, () => ({ create: openCreate }), [openCreate]);

  function openEdit(order) {
    setDraft({ ...order, notas: order.notas || "", items: (order.items || []).map(line => ({ ...line, key: line.id || `saved-${++lineSequence.current}`, kind: line.productoId ? "producto" : "concepto" })) });
    setClientSnapshot(clientes.find(client => client.id === order.clienteId) || { id: order.clienteId, nombre: order.cliente });
    setClientCreating(false);
    setClientBusy(false);
    setEditingId(order.id);
    setModalOpen(true);
  }

  function closeModal(force = false) {
    if ((submitting.current || clientBusy) && force !== true) return;
    setModalOpen(false);
    setEditingId(null);
    setClientCreating(false);
  }

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function addLine(kind) {
    const key = `new-${++lineSequence.current}`;
    setDraft(previous => previous.items.length >= 100 ? previous : ({ ...previous, items: [...previous.items, {
      key, kind, productoId: "", nombre: "", cantidad: "1", precio: "", nivelPrecio: "normal", actualizarPrecio: true,
    }] }));
  }

  function selectProduct(index, product) {
    if (product) rememberProduct(product);
    setDraft(previous => ({ ...previous, items: previous.items.map((line, lineIndex) => lineIndex === index ? {
      ...line, productoId: product?.id || "", nombre: product?.nombre || "", precio: product ? Number(product.precio) : "", nivelPrecio: "normal", actualizarPrecio: true,
    } : line) }));
  }

  function updateLine(index, field, value) {
    setDraft(previous => ({ ...previous, items: previous.items.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === "nivelPrecio" || field === "actualizarPrecio") {
        const product = catalogProduct(line.productoId);
        const level = field === "nivelPrecio" ? value : line.nivelPrecio || "normal";
        const price = priceAt(product, level);
        return price == null ? line : { ...line, nivelPrecio: level, precio: price, actualizarPrecio: true };
      }
      return { ...line, [field]: value };
    }) }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!canWrite || submitting.current || clientBusy) return;
    if (clientCreating) { notifyError("Guarda o cancela el alta del cliente antes de guardar el documento."); return; }
    if (!draft.clienteId) { notifyError("Busca y selecciona un cliente."); return; }
    if (!validLines && !legacyHeaderOnly) { notifyError("Añade al menos un producto o concepto y completa sus cantidades y precios."); return; }
    submitting.current = true;
    setSaving(true);
    try {
      const items = draft.items.map(line => ({
        ...(line.id ? { id: line.id } : {}),
        productoId: line.productoId || null, nombre: line.nombre.trim(), cantidad: Number(line.cantidad), precio: Number(line.precio),
        ...(line.productoId ? { nivelPrecio: line.nivelPrecio || "normal", actualizarPrecio: line.actualizarPrecio === true } : {}),
      }));
      const payload = { ...draft, items, monto: total };
      let saved;
      try {
        if (editingId) {
          saved = await updateOrder(editingId, payload);
          setOrders((current) =>
            current.map((order) => (order.id === editingId ? saved : order)),
          );
          show("Orden actualizada.");
        } else {
          saved = await createOrder(payload);
          setOrders((current) => [saved, ...current]);
          show("Orden creada.");
        }
      } catch (error) {
        notifyError(error.message || "No se pudo guardar la orden.");
        return;
      }
      closeModal(true);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      {!hideTopbar && (
        <Topbar
          chromeOnly={chromeOnly}
          title="Ventas"
          subtitle="Crea cotizaciones o facturas fiscales con productos del catálogo y servicios. Nueva venta incluye ISV y descuenta inventario. Las cotizaciones no descuentan inventario."
          action={!hideCreateActions &&
            <div className={styles.salesActionRow} role="group" aria-label="Crear documento comercial">
              <button type="button" className={`${styles.ghostBtn} ${styles.salesActionBtn}`} disabled={!canWrite || saving} onClick={() => openCreate("cotizacion")}>
                <Plus size={16} /> Nueva cotización
              </button>
            </div>
          }
          session={session}
          workers={workers}
        />
      )}

      <div className={styles.body}>
        {onTabChange && tabs ? (
          <SectionTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} label="Secciones de ventas" />
        ) : null}

        {chromeOnly && hideTopbar && (
          <div className={styles.sectionSubBar}>
            <div className={styles.topbarTitle}>
              <h1>Ventas</h1>
              <p>Crea cotizaciones o facturas fiscales con productos del catálogo y servicios. Nueva venta incluye ISV y descuenta inventario. Las cotizaciones no descuentan inventario.</p>
              {headerActions}
            </div>
          </div>
        )}

        {listNotice}
        {!hideList && <>
        <section className={styles.stats} aria-label="Resumen de cotizaciones y ventas">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><FileText size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Cotizaciones</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={styles.statValue}>{stats.pendientes}</strong>
            <span className={styles.statLabel}>Pendientes</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.ventas}</strong>
            <span className={styles.statLabel}>Ventas</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><TrendingUp size={18} /></span>
            <strong className={styles.statValue}>{formatPrice(stats.totalMonto)}</strong>
            <span className={styles.statLabel}>Valor total</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por número, cliente o notas"
              aria-label="Buscar cotizaciones y ventas"
            />
          </label>
          <select
            className={styles.select}
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos los tipos</option>
            {ORDER_TYPES.map((item) => (
              <option key={item.id} value={item.id}>{item.id === "venta" ? "Ventas" : item.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de cotizaciones y ventas">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.sourceKey}>
                    <td data-label="Documento" className={styles.cellMain}><code>{order.numero || order.id}</code>{order.fiscal && (!order.fiscal.cai || !order.fiscal.correlativo) && <small className={salesStyles.pendingFiscal}>Pendiente de CAI · sin validez fiscal</small>}</td>
                    <td data-label="Cliente">
                      <div className={styles.person}>
                        <span className={styles.avatar}>{initialsCliente(order.cliente)}</span>
                        <span className={styles.personMeta}>
                          <strong>{order.cliente}</strong>
                        </span>
                      </div>
                    </td>
                    <td data-label="Tipo"><span className={styles.role}>{order.fiscal ? fiscalTypeLabel(order.fiscal) : order.tipo === "venta" ? "Venta comercial (histórica)" : orderTypeLabel(order.tipo)}</span></td>
                    <td data-label="Fecha">{formatOrderDate(order.fecha)}</td>
                    <td className={styles.priceCell} data-label="Monto">{formatPrice(order.monto)}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${order.estado}`]}`}>
                        {order.fiscal ? order.estado === "cancelada" ? "Anulada" : "Emitida" : orderStatusLabel(order.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openApiDocument(order.fiscal ? `/api/facturacion/documentos/${encodeURIComponent(order.id)}/pdf` : `/api/ordenes/${encodeURIComponent(order.id)}/documento`).catch(error => notifyError(error?.message || "No se pudo abrir el documento."))}
                          aria-label={`Imprimir o guardar PDF de ${order.id}`}
                          title="Imprimir o guardar como PDF"
                        >
                          <Printer size={15} />
                        </button>
                        {order.fiscal ? <>
                          <button type="button" onClick={() => onFiscalDetail?.(order.fiscal)} aria-label={`Ver ${order.numero}`} title="Ver factura"><Eye size={15} /></button>
                          {order.estado !== "cancelada" && canAnnulFiscal && <button type="button" className={styles.danger} onClick={() => onFiscalAnnul?.(order.fiscal)} aria-label={`Anular ${order.numero}`} title="Anular con motivo"><X size={15} /></button>}
                        </> : <>
                        {canWrite && <button
                          type="button"
                          disabled={saving} onClick={() => openEdit(order)}
                          aria-label={`Editar ${order.id}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>}
                        {canDelete && <button
                          type="button"
                          className={styles.danger}
                          disabled={saving} onClick={() => setConfirmOrder(order)}
                          aria-label={`Eliminar ${order.id}`}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>}
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filtered.length && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><FileText size={22} /></span>
                <strong>{type === "venta" ? "Sin ventas" : type === "cotizacion" ? "Sin cotizaciones" : "Sin documentos"}</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : type === "venta" ? "Aún no has emitido ventas." : type === "cotizacion" ? "Aún no has creado cotizaciones. Crea la primera." : "Aún no hay cotizaciones ni ventas registradas."}
                </p>
              </div>
            )}
          </div>
        </section>
        </>}
      </div>

      {modalOpen && (
        <DialogBackdrop className={`${styles.overlay} ${styles.centeredOverlay}`} onDismiss={closeModal}>
          <div className={styles.modal} data-drag-scroll="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label={editingId ? "Editar documento" : draft.tipo === "venta" ? "Nueva venta comercial" : "Nueva cotización"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nueva"}</p>
                <h2>{editingId ? "Editar documento" : draft.tipo === "venta" ? "Crear venta comercial" : "Crear cotización"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} disabled={busy} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={`${styles.form} ${salesStyles.commercialForm}`} onSubmit={submitOrder}>
              <div className={styles.fieldGrid}>
                <div className={styles.spanFull}>
                  <ClienteSelector
                    value={draft.clienteId}
                    fallback={clientSnapshot}
                    onChange={selectClient}
                    onCreated={client => setClientes?.(current => [client, ...current.filter(item => item.id !== client.id)])}
                    session={session}
                    disabled={saving}
                    onBusyChange={setClientBusy}
                    onModeChange={setClientCreating}
                  />
                </div>
                <label className={styles.field}>
                  Tipo de documento
                  <input readOnly value={draft.tipo === "venta" ? "Venta comercial histórica" : "Cotización"} />
                </label>
                <label className={styles.field}>
                  Fecha
                  <input
                    type="date"
                    className={salesStyles.dateInput}
                    disabled={busy}
                    value={draft.fecha}
                    onChange={(event) => changeField("fecha", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select disabled={busy} value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {ORDER_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <section className={`${salesStyles.lines} ${styles.spanFull}`} aria-label="Productos y conceptos">
                  <div className={salesStyles.lineHead}><strong>Productos o conceptos</strong><small className={salesStyles.hint}>{draft.items.length} / 100</small></div>
                  {!draft.items.length && <p className={salesStyles.hint}>{legacyHeaderOnly
                    ? "Documento anterior o solicitud sin detalle: se conserva su importe guardado al editar la cabecera. Puedes añadir líneas para detallar el documento; al cambiar cantidades o precios se recalcula su importe."
                    : "Añade un producto del catálogo o un concepto / servicio. El total se calcula con las cantidades y tarifas."}</p>}
                  {draft.items.map((line, index) => <div key={line.key || line.id} className={salesStyles.line}>
                    <div className={salesStyles.lineHead}>
                      <strong>{line.kind === "concepto" ? "Concepto / servicio" : "Producto"} {index + 1}</strong>
                      <button type="button" className={styles.clearBtn} disabled={busy} onClick={() => setDraft(previous => ({ ...previous, items: previous.items.filter((_, position) => position !== index) }))} aria-label={`Quitar línea ${index + 1}`}>Quitar</button>
                    </div>
                    {line.kind === "producto" ? <ReferenciaSelector
                      kind="productos"
                      label={`Producto de la línea ${index + 1}`}
                      value={line.productoId}
                      fallback={catalogProduct(line.productoId) || { id: line.productoId, nombre: line.nombre }}
                      disabled={busy}
                      onChange={product => selectProduct(index, product)}
                      onResolved={rememberProduct}
                    /> : <label className={styles.field}>Concepto o servicio
                      <input maxLength={1000} value={line.nombre} onChange={event => updateLine(index, "nombre", event.target.value)} placeholder="Ej. Instalación, visita técnica…" required disabled={busy} />
                    </label>}
                    <div className={salesStyles.lineGrid}>
                      {line.productoId && <label className={styles.field}>Tarifa
                        <PrecioSelector product={catalogProduct(line.productoId)} value={line.nivelPrecio || "normal"} onChange={value => updateLine(index, "nivelPrecio", value)} label={`Tarifa de la línea ${index + 1}`} snapshot={editingId && !line.actualizarPrecio ? line.precio : null} disabled={busy} />
                      </label>}
                      {line.kind === "concepto" && <label className={styles.field}>Precio unitario (L)
                        <input type="number" min="0" step="0.01" value={line.precio} onChange={event => updateLine(index, "precio", event.target.value)} placeholder="0.00" required disabled={busy} />
                      </label>}
                      <label className={styles.field}>Cantidad
                        <input type="number" min={line.kind === "producto" ? "1" : "0.001"} step={line.kind === "producto" ? "1" : "0.001"} value={line.cantidad} onChange={event => updateLine(index, "cantidad", event.target.value)} aria-label={`Cantidad de la línea ${index + 1}`} required disabled={busy} />
                      </label>
                    </div>
                    {editingId && line.productoId && !line.actualizarPrecio && <button type="button" className={styles.ghostBtn} disabled={busy || priceAt(catalogProduct(line.productoId), line.nivelPrecio || "normal") == null} onClick={() => updateLine(index, "actualizarPrecio", true)}>Actualizar tarifa</button>}
                    <div className={salesStyles.lineTotal}>Importe de línea: {formatPrice(commercialTotal([line]))}</div>
                  </div>)}
                  <div className={salesStyles.actions}>
                    <button type="button" className={styles.ghostBtn} onClick={() => addLine("producto")} disabled={busy || draft.items.length >= 100}><Plus size={15} /> Añadir producto</button>
                    <button type="button" className={styles.ghostBtn} onClick={() => addLine("concepto")} disabled={busy || draft.items.length >= 100}><Plus size={15} /> Añadir concepto / servicio</button>
                  </div>
                  <small className={salesStyles.hint}>Valor 1: venta normal; Valor 2: descuento; Valor 3: mayorista. Los precios guardados se conservan al editar, salvo que elijas otra tarifa o «Actualizar tarifa». Las cotizaciones no descuentan inventario. Los precios de los históricos se conservan. Para emitir una factura fiscal, usa Nueva venta.</small>
                  <div className={salesStyles.total}><span>{legacyHeaderOnly ? "Importe histórico" : keepSavedAmount && total !== commercialTotal(draft.items) ? "Total guardado" : "Total calculado"}</span><output aria-label="Total del documento" aria-live="polite">{formatPrice(total)}</output></div>
                  {total > MAX_DOCUMENT_AMOUNT && <p className={salesStyles.error} role="alert">El total supera el importe máximo permitido. Reduce cantidades o precios.</p>}
                  {keepSavedAmount && draft.items.length > 0 && total !== commercialTotal(draft.items) && <small className={salesStyles.hint}>Se conserva el importe histórico del documento. Se recalculará al cambiar productos, cantidades o precios.</small>}
                </section>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Notas
                  <textarea
                    value={draft.notas}
                    disabled={busy}
                    onChange={(event) => changeField("notas", event.target.value)}
                    placeholder={draft.tipo === "venta" ? "Condiciones de pago, entrega y observaciones..." : "Detalles de la cotización..."}
                    rows={3}
                  />
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} disabled={busy} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit} disabled={busy || clientCreating || !draft.clienteId || (!validLines && !legacyHeaderOnly)}>
                  {saving ? "Guardando…" : editingId ? "Guardar cambios" : draft.tipo === "venta" ? "Crear venta comercial" : "Crear cotización"}
                </button>
              </footer>
            </form>
          </div>
        </DialogBackdrop>
      )}

      {confirmOrder && (
        <ConfirmDialog
          title={confirmOrder.tipo === "venta" ? "Eliminar venta" : "Eliminar cotización"}
          message={
            <>
              ¿Seguro que deseas eliminar {confirmOrder.tipo === "venta" ? "la venta" : "la cotización"} <strong>{confirmOrder.id}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmOrder(null)}
          onConfirm={async () => {
            try {
              await deleteOrder(confirmOrder.id);
              setOrders((current) =>
                current.filter((order) => order.id !== confirmOrder.id),
              );
              show(confirmOrder.tipo === "venta" ? "Venta eliminada." : "Cotización eliminada.");
            } catch (error) {
              show(error.message || "No se pudo eliminar el documento.", "error");
            }
            setConfirmOrder(null);
          }}
        />
      )}

    </>
  );
}
