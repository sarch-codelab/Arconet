"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileText, Pencil, Plus, Printer, Search, Trash2, TrendingUp, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { AdminContext } from "./admin-nav";
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
import { createCliente, newClienteId, initialsCliente } from "./clientes-store";
import { formatPrice } from "./products-store";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";

export default function CotizacionesSection({ orders = [], setOrders, clientes = [], setClientes, products = [], workers = [], session, hideTopbar = false, chromeOnly = false, tabs, activeTab: controlledTab, onTabChange }) {
  const [innerTab, setInnerTab] = useState("todas");
  const activeTab = controlledTab ?? innerTab;
  // Pestana inicial "Todas": sin filtro de tipo (se ven cotizaciones y ventas).
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    id: "",
    tipo: "cotizacion",
    clienteId: "",
    cliente: "",
    fecha: new Date().toISOString().split("T")[0],
    monto: "",
    estado: "pendiente",
    items: [],
    notas: "",
  });
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: "", rtn: "", correo: "", telefono: "" });
  const { show } = useToast();

  // El buscador global de la cabecera delega aqui (ver ventas-section.js):
  // al pulsar Enter copia su termino al filtro de esta lista.
  const adminCtx = useContext(AdminContext);
  useEffect(() => {
    // Enter en el buscador global -> filtra esta lista (seccion Ventas).
    if (typeof adminCtx?.applyVentasSearch === "function") {
      adminCtx.applyVentasSearch = (term) => setQuery(String(term || ""));
    }
    const onGlobalSearch = (event) => setQuery(String(event.detail || ""));
    window.addEventListener("arconet:ventas-search", onGlobalSearch);
    return () => window.removeEventListener("arconet:ventas-search", onGlobalSearch);
  }, [adminCtx]);

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

  const handleTabChange = (tabId) => {
    if (tabId === "facturas") {
      // La pestaña "Facturas" monta el panel fiscal completo; no toca los
      // filtros de cotizaciones ni el estado interno de esta lista.
      onTabChange?.(tabId);
      return;
    }
    setInnerTab(tabId);
    onTabChange?.(tabId);
    // Las facturas fiscales viven en la pestana "Facturas" de esta misma
    // seccion; aqui solo hay cotizaciones y ventas comerciales.
    if (tabId === "todas") {
      // Pestana inicial "Todas": cotizaciones y ventas, nunca facturas fiscales.
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
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      // Nunca mostrar facturas fiscales aqui: pertenecen a Facturacion.
      if (order.tipo === "factura") return false;
      if (status !== "all" && order.estado !== status) return false;
      if (type !== "all" && order.tipo !== type) return false;
      if (!searchTerms.length) return true;
      // Busqueda amplia: numero de orden, cliente guardado o escrito a mano,
      // RTN/correo/telefono del cliente, notas y productos de las lineas.
      const haystack = normalize([
        order.id,
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
  }, [orders, searchTerms, status, type]);

  const stats = useMemo(() => {
    // Las facturas fiscales no cuentan aqui: pertenecen a Facturacion.
    const comerciales = orders.filter((order) => order.tipo !== "factura");
    const cotizaciones = comerciales.filter((order) => order.tipo === "cotizacion");
    const total = cotizaciones.length;
    const pendientes = cotizaciones.filter((order) => order.estado === "pendiente").length;
    const aprobadas = cotizaciones.filter((order) => order.estado === "aprobada").length;
    const totalMonto = comerciales.reduce((sum, order) => sum + Number(order.monto || 0), 0);
    return { total, pendientes, aprobadas, totalMonto };
  }, [orders]);

  const hasFilters = query.trim() !== "" || status !== "all" || type !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setType("all");
    setInnerTab("todas");
    onTabChange?.("todas");
  }

  function openCreate(documentType = "cotizacion") {
    setDraft({
      id: newOrderId(),
      tipo: documentType,
      clienteId: "",
      cliente: "",
      fecha: new Date().toISOString().split("T")[0],
      monto: "",
      estado: "pendiente",
      items: [],
      notas: "",
    });
    setEditingId(null);
    setNewClientMode(false);
    setNewClient({ nombre: "", rtn: "", correo: "", telefono: "" });
    setModalOpen(true);
  }

  function openEdit(order) {
    setDraft({ ...order });
    setEditingId(order.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setNewClientMode(false);
  }

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function addCatalogItem() {
    const product = products.find((item) => item.estado === "activo");
    if (!product) return;
    setDraft((prev) => ({ ...prev, items: [...prev.items, { productoId: product.id, nombre: product.nombre, cantidad: 1, precio: Number(product.precio) || 0 }] }));
  }

  function updateLine(index, field, value) {
    setDraft((prev) => ({ ...prev, items: prev.items.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === "productoId") {
        const product = products.find((item) => item.id === value);
        return product ? { ...line, productoId: product.id, nombre: product.nombre, precio: Number(product.precio) || 0 } : line;
      }
      return { ...line, [field]: value };
    }) }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if ((!newClientMode && !draft.clienteId) || (newClientMode && newClient.nombre.trim().length < 2) || (!newClientMode && !draft.cliente.trim())) {
      notifyError("El cliente es obligatorio.");
      return;
    }
    const items = draft.items.map((line) => ({ ...line, cantidad: Number(line.cantidad), precio: Number(line.precio) }));
    let clienteId = draft.clienteId;
    let clienteNombre = draft.cliente.trim();
    if (newClientMode) {
      try {
        const savedClient = await createCliente({ id: newClienteId(), nombre: newClient.nombre.trim(), rtn: newClient.rtn.trim(), correo: newClient.correo.trim(), telefono: newClient.telefono.trim(), estado: "prospecto" });
        setClientes((current) => [savedClient, ...current]);
        clienteId = savedClient.id;
        clienteNombre = savedClient.nombre;
      } catch (error) {
        notifyError(error.message || "No se pudo registrar el cliente.");
        return;
      }
    }
    const computedTotal = items.reduce((sum, line) => sum + line.cantidad * line.precio, 0);
    const payload = {
      ...draft,
      clienteId,
      cliente: clienteNombre,
      items,
      monto: items.length ? computedTotal : Number(draft.monto) || 0,
    };
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
    closeModal();
  }

  return (
    <>
      {!hideTopbar && (
        <Topbar
          chromeOnly={chromeOnly}
          title="Ventas"
          subtitle="Crea cotizaciones o ventas comerciales con productos del catálogo. Las ventas descuentan inventario; las facturas fiscales se emiten en la pestaña Facturas."
          action={
            <div className={`${styles.topbarActions} ${styles.salesActions}`}>
              <button type="button" className={styles.ghostBtn} onClick={() => openCreate("cotizacion")}>
                <Plus size={16} /> Nueva cotización
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => openCreate("venta")}>
                <Plus size={16} /> Nueva venta
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
              <p>Crea cotizaciones o ventas comerciales con productos del catálogo. Las ventas descuentan inventario; las facturas fiscales se emiten en la pestaña Facturas.</p>
            </div>
            <div className={`${styles.topbarActions} ${styles.salesActions}`}>
              <button type="button" className={styles.ghostBtn} onClick={() => openCreate("cotizacion")}>
                <Plus size={16} /> Nueva cotización
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => openCreate("venta")}>
                <Plus size={16} /> Nueva venta
              </button>
            </div>
          </div>
        )}

        <section className={styles.stats} aria-label="Resumen de cotizaciones">
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
            <strong className={styles.statValue}>{stats.aprobadas}</strong>
            <span className={styles.statLabel}>Aprobadas</span>
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
              placeholder="Buscar por cliente o notas"
              aria-label="Buscar cotizaciones"
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
              <option key={item.id} value={item.id}>{item.label}</option>
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

        <section className={styles.tableCard} aria-label="Listado de cotizaciones">
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
                  <tr key={order.id}>
                    <td data-label="Documento" className={styles.cellMain}><code>{order.id}</code></td>
                    <td data-label="Cliente">
                      <div className={styles.person}>
                        <span className={styles.avatar}>{initialsCliente(order.cliente)}</span>
                        <span className={styles.personMeta}>
                          <strong>{order.cliente}</strong>
                        </span>
                      </div>
                    </td>
                    <td data-label="Tipo"><span className={styles.role}>{orderTypeLabel(order.tipo)}</span></td>
                    <td data-label="Fecha">{formatOrderDate(order.fecha)}</td>
                    <td className={styles.priceCell} data-label="Monto">{formatPrice(order.monto)}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${order.estado}`]}`}>
                        {orderStatusLabel(order.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => window.open(`/api/ordenes/${encodeURIComponent(order.id)}/documento`, "_blank", "noopener,noreferrer")}
                          aria-label={`Imprimir o guardar PDF de ${order.id}`}
                          title="Imprimir o guardar como PDF"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(order)}
                          aria-label={`Editar ${order.id}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmOrder(order)}
                          aria-label={`Eliminar ${order.id}`}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filtered.length && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><FileText size={22} /></span>
                <strong>{type === "venta" ? "Sin ventas" : "Sin cotizaciones"}</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : type === "venta" ? "Aún no has creado ventas comerciales." : "Aún no has creado cotizaciones. Crea la primera."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar documento" : draft.tipo === "venta" ? "Nueva venta comercial" : "Nueva cotización"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nueva"}</p>
                <h2>{editingId ? "Editar documento" : draft.tipo === "venta" ? "Crear venta comercial" : "Crear cotización"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitOrder}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Cliente
                  <select value={newClientMode ? "__nuevo__" : draft.clienteId} onChange={(event) => {
                    if (event.target.value === "__nuevo__") {
                      setNewClientMode(true);
                      changeField("clienteId", "");
                      changeField("cliente", "");
                      return;
                    }
                    setNewClientMode(false);
                    const cliente = clientes.find((c) => c.id === event.target.value);
                    changeField("clienteId", event.target.value);
                    changeField("cliente", cliente ? cliente.nombre : "");
                  }}>
                    <option value="">Seleccionar cliente</option>
                    <option value="__nuevo__">Cliente eventual / no registrado</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                    ))}
                  </select>
                </label>
                {newClientMode && <>
                  <label className={styles.field}>Nombre o razón social<input value={newClient.nombre} onChange={(event) => setNewClient((current) => ({ ...current, nombre: event.target.value }))} required /></label>
                  <label className={styles.field}>RTN (opcional)<input value={newClient.rtn} onChange={(event) => setNewClient((current) => ({ ...current, rtn: event.target.value }))} /></label>
                  <label className={styles.field}>Correo (opcional)<input type="email" value={newClient.correo} onChange={(event) => setNewClient((current) => ({ ...current, correo: event.target.value }))} /></label>
                  <label className={styles.field}>Teléfono (opcional)<input type="tel" value={newClient.telefono} onChange={(event) => setNewClient((current) => ({ ...current, telefono: event.target.value }))} /></label>
                </>}
                <label className={styles.field}>
                  Tipo
                  <select value={draft.tipo} onChange={(event) => changeField("tipo", event.target.value)}>
                    {ORDER_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Fecha
                  <input
                    type="date"
                    value={draft.fecha}
                    onChange={(event) => changeField("fecha", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {ORDER_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Monto (L)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.items.length ? draft.items.reduce((sum, line) => sum + Number(line.cantidad || 0) * Number(line.precio || 0), 0).toFixed(2) : draft.monto}
                    onChange={(event) => changeField("monto", event.target.value)}
                    placeholder="0.00"
                    readOnly={draft.items.length > 0}
                  />
                </label>
                <div className={`${styles.field} ${styles.spanFull}`}>
                  <span>Productos de catálogo</span>
                  {draft.items.map((line, index) => <div key={`${index}-${line.productoId}`} className={styles.toolbar}>
                    <select className={styles.select} value={line.productoId || ""} onChange={(event) => updateLine(index, "productoId", event.target.value)} aria-label={`Producto de la línea ${index + 1}`}>
                      {products.filter((item) => item.estado === "activo" || item.id === line.productoId).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {formatPrice(item.precio)}</option>)}
                    </select>
                    <input className={styles.lineQuantity} type="number" min="0.001" step="0.001" value={line.cantidad} onChange={(event) => updateLine(index, "cantidad", event.target.value)} aria-label="Cantidad" />
                    <button type="button" className={styles.clearBtn} onClick={() => setDraft((prev) => ({ ...prev, items: prev.items.filter((_, lineIndex) => lineIndex !== index) }))}>Quitar</button>
                  </div>)}
                  <button type="button" className={styles.ghostBtn} onClick={addCatalogItem} disabled={!products.some((item) => item.estado === "activo")}>Añadir producto real del catálogo</button>
                  <small>El total se calcula con los precios de catálogo. Al guardar una venta se descuenta el inventario; una venta comercial no sustituye el comprobante fiscal autorizado, que se emite en Facturación.</small>
                </div>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Notas
                  <textarea
                    value={draft.notas}
                    onChange={(event) => changeField("notas", event.target.value)}
                    placeholder={draft.tipo === "venta" ? "Condiciones de pago, entrega y observaciones..." : "Detalles de la cotización..."}
                    rows={3}
                  />
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : draft.tipo === "venta" ? "Crear venta comercial" : "Crear cotización"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmOrder && (
        <ConfirmDialog
          title="Eliminar cotización"
          message={
            <>
              ¿Seguro que deseas eliminar la cotización <strong>{confirmOrder.id}</strong>? Esta
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
              show("Cotización eliminada.");
            } catch (error) {
              show(error.message || "No se pudo eliminar la cotización.", "error");
            }
            setConfirmOrder(null);
          }}
        />
      )}

    </>
  );
}
