"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Lock,
  LogOut,
  MailWarning,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Ticket,
  User,
  X,
} from "lucide-react";
import styles from "./cliente-experience.module.css";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from '@/lib/contact';
import { fuerzaPassword, validarPassword } from '@/lib/seguridad';
import { sileo } from "../toaster";

const FUERZA_LABEL = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];

export default function ClientExperience() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPortal() {
      try {
        const sessionResponse = await fetch("/api/cliente-auth/session", { cache: "no-store" });
        if (sessionResponse.status === 401) {
          router.replace("/login");
          return;
        }
        const sessionData = await sessionResponse.json().catch(() => ({}));
        if (!sessionResponse.ok) throw new Error(sessionData.error || "No se pudo verificar la cuenta.");

        const ordersResponse = await fetch("/api/ordenes", { cache: "no-store" });
        const ordersData = await ordersResponse.json().catch(() => ({}));
        if (!ordersResponse.ok) throw new Error(ordersData.error || "No se pudieron cargar tus solicitudes.");
        if (!active) return;
        setSession(sessionData);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setLoadError("");
        setReady(true);
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || "No se pudieron cargar los datos de la cuenta.");
      }
    }
    loadPortal();
    return () => { active = false; };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/cliente-auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  };

  if (!ready) {
    return (
      <main className={styles.clientDashboard} aria-busy={!loadError}>
        {loadError ? <p role="alert">{loadError}</p> : null}
      </main>
    );
  }

  return <ClientDashboard session={session} orders={orders} setOrders={setOrders} onLogout={handleLogout} />;
}

function ClientDashboard({ session, orders, setOrders, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestForm, setRequestForm] = useState({
    tipo: "cotizacion",
    proyecto: "",
    descripcion: "",
    presupuesto: "",
    urgencia: "normal",
  });

  const quoteOrders = orders.filter((order) => order.tipo === "cotizacion" && !order.id.startsWith("t-"));
  const projectOrders = orders.filter((order) => ["aprobada", "en_proceso", "completada"].includes(order.estado));
  // Total acumulado: solo cotizaciones aprobadas/en ejecución/completadas.
  // Excluye pendientes, rechazadas y canceladas (fix del bug del dashboard).
  const totalActivo = orders
    .filter((order) => ["aprobada", "en_proceso", "en_preparacion", "despachada", "entregada", "completada"].includes(order.estado))
    .reduce((sum, order) => sum + order.monto, 0);

  async function handleOrderAction(id, accion) {
    const response = await fetch(`/api/cliente-portal/ordenes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      sileo.error({ title: payload.error || "No se pudo registrar la acción." });
      return;
    }
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, estado: payload.estado } : order)));
    setSelectedOrder((current) => (current && current.id === id ? { ...current, estado: payload.estado } : current));
    const labels = { aprobar: "Cotización aprobada", rechazar: "Cotización rechazada", cancelar: "Solicitud cancelada" };
    sileo.success({ title: labels[accion] || "Acción registrada" });
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("orden-detalle");
  };

  const handleCreateRequest = () => {
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (requestSaving) return;
    setRequestSaving(true);
    try {
      const response = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar la solicitud.");
      setOrders((current) => [payload, ...current]);
      setRequestModalOpen(false);
      setRequestForm({ tipo: "cotizacion", proyecto: "", descripcion: "", presupuesto: "", urgencia: "normal" });
    } catch (error) {
      sileo.error({ title: error.message || "No se pudo guardar la solicitud." });
    } finally {
      setRequestSaving(false);
    }
  };

  return (
    <main className={styles.clientDashboard}>
      <div className={styles.dashboardShell}>
        <div className={styles.dashboardContent}>
          <header className={styles.dashboardTopbar}>
            <div className={styles.brandArea}>
              <a className={styles.logo} href="/" aria-label="Arconet, inicio">
                <img src="/arconet.png" alt="Arconet" />
              </a>
              <span className={styles.logoTag}>Portal de clientes</span>
            </div>
            <nav className={styles.nav} aria-label="Secciones del portal">
              {[
                ["dashboard", "Dashboard", Building2],
                ["cotizaciones", "Cotizaciones", FileText],
                ["proyectos", "Proyectos", Package],
                ["soporte", "Soporte", Check],
                ["documentos", "Documentos", Download],
                ["perfil", "Mi perfil", User],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.navItem} ${activeTab === id ? styles.navActive : ""}`}
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? "page" : undefined}
                  title={label}
                >
                  <Icon size={15} />
                  {activeTab === id ? <span>{label}</span> : null}
                </button>
              ))}
            </nav>
            <div className={styles.topbarTitle}>
              <h1>
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "cotizaciones" && "Mis cotizaciones"}
                {activeTab === "proyectos" && "Mis proyectos"}
                {activeTab === "soporte" && "Soporte técnico"}
                {activeTab === "documentos" && "Documentos"}
                {activeTab === "perfil" && "Mi perfil"}
                {activeTab === "orden-detalle" && "Detalle de cotización"}
              </h1>
            </div>
            <div className={styles.topbarActions}>
              {activeTab === "cotizaciones" && (
                <button type="button" className={styles.primaryBtn} onClick={handleCreateRequest}>
                  <Plus size={16} /> Nueva solicitud
                </button>
              )}
              <NotificationsBell />
              <button type="button" className={styles.accountButton} onClick={onLogout} aria-label="Cerrar sesión" title={`Cerrar sesión de ${session.nombre}`}>
                <span className={styles.userAvatar}>{session.nombre[0]}</span>
                <LogOut size={15} />
              </button>
            </div>
          </header>

          <div className={styles.dashboardBody}>
            {session.verificado === false && (
              <div className={styles.verifyBanner} role="status">
                <MailWarning size={16} />
                <p>
                  Verifica <strong>{session.correo}</strong> para recibir avisos de tus
                  cotizaciones y entregas.
                </p>
                <Link href="/verificar">Verificar ahora</Link>
              </div>
            )}

            {activeTab === "dashboard" && (
              <div className={styles.dashboardGrid}>
                <section className={styles.welcomeCard}>
                  <h2>Bienvenido, {session.nombre}</h2>
                  <p>Gestiona tus cotizaciones y proyectos de infraestructura.</p>
                </section>

                <section className={styles.statsGrid}>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><FileText size={20} /></span>
                    <strong className={styles.statValue}>{quoteOrders.length}</strong>
                    <span className={styles.statLabel}>Cotizaciones</span>
                  </article>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><Check size={20} /></span>
                    <strong className={styles.statValue}>
                      {orders.filter((order) => order.estado === "completada").length}
                    </strong>
                    <span className={styles.statLabel}>Completadas</span>
                  </article>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><Package size={20} /></span>
                    <strong className={styles.statValue}>{totalActivo.toLocaleString("es-HN")} L</strong>
                    <span className={styles.statLabel}>Total activo</span>
                  </article>
                </section>

                <section className={styles.recentOrders}>
                  <h3>Cotizaciones recientes</h3>
                  <div className={styles.orderList}>
                    {quoteOrders.length === 0 ? <p>Aún no tienes cotizaciones registradas.</p> : quoteOrders.map((order) => (
                      <div key={order.id} className={styles.orderCard} onClick={() => handleViewOrder(order)}>
                        <div className={styles.orderHeader}>
                          <strong>{order.id}</strong>
                          <span className={`${styles.orderStatus} ${styles[`status_${order.estado}`]}`}>
                            {order.estado === "pendiente" ? "Pendiente" : order.estado}
                          </span>
                        </div>
                        <p>{order.notas}</p>
                        <div className={styles.orderMeta}>
                          <span>{order.fecha}</span>
                          <strong>{order.monto.toLocaleString()} L</strong>
                        </div>
                        <button type="button" className={styles.viewBtn}>
                          Ver detalles <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "cotizaciones" && (
              <div className={styles.ordersPage}>
                <h2>Mis cotizaciones</h2>
                <div className={styles.orderList}>
                  {quoteOrders.length === 0 ? <p>Aún no tienes cotizaciones registradas.</p> : quoteOrders.map((order) => (
                    <div key={order.id} className={styles.orderCard} onClick={() => handleViewOrder(order)}>
                      <div className={styles.orderHeader}>
                        <strong>{order.id}</strong>
                        <span className={`${styles.orderStatus} ${styles[`status_${order.estado}`]}`}>
                          {order.estado === "pendiente" ? "Pendiente" : order.estado}
                        </span>
                      </div>
                      <p>{order.notas}</p>
                      <div className={styles.orderMeta}>
                        <span>{order.fecha}</span>
                        <strong>{order.monto.toLocaleString()} L</strong>
                      </div>
                      <button type="button" className={styles.viewBtn}>
                        Ver detalles <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "proyectos" && (
              <div className={styles.projectsPage}>
                <h2>Mis proyectos</h2>
                <div className={styles.projectGrid}>
                  {projectOrders.length === 0 ? (
                    <p>Los proyectos confirmados aparecerán aquí cuando una cotización sea aprobada.</p>
                  ) : projectOrders.map((order) => (
                    <article key={order.id} className={styles.projectCard}>
                      <div className={styles.projectHeader}>
                        <span className={styles.projectType}>Proyecto</span>
                        <span className={`${styles.projectStatus} ${styles[`status_${order.estado}`]}`}>
                          {order.estado.replaceAll("_", " ")}
                        </span>
                      </div>
                      <h3>{order.notas.split("\n")[0]?.replace(/^Proyecto: /, "") || order.id}</h3>
                      <p>{order.notas}</p>
                      <div className={styles.projectMeta}>
                        <span><Clock size={14} /> {order.fecha}</span>
                        <span><FileText size={14} /> {order.id}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "soporte" && (
              <SupportPage session={session} />
            )}

            {activeTab === "documentos" && (
              <DocumentsPage />
            )}

            {activeTab === "perfil" && (
              <ProfilePage session={session} onSessionUpdate={setSession} />
            )}

            {activeTab === "orden-detalle" && selectedOrder && (
              <div className={styles.orderDetailPage}>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => { setActiveTab("cotizaciones"); setSelectedOrder(null); }}
                >
                  <ArrowLeft size={16} /> Volver a cotizaciones
                </button>
                <div className={styles.orderDetailHeader}>
                  <div>
                    <h2>{selectedOrder.id}</h2>
                    <p>{selectedOrder.notas}</p>
                  </div>
                  <span className={`${styles.orderStatus} ${styles[`status_${selectedOrder.estado}`]} ${styles.statusLarge}`}>
                    {selectedOrder.estado === "pendiente" ? "Pendiente" : selectedOrder.estado}
                  </span>
                </div>
                <div className={styles.orderDetailGrid}>
                  <div className={styles.orderInfoCard}>
                    <h3>Información general</h3>
                    <div className={styles.infoRow}>
                      <span>Tipo</span>
                      <strong>{selectedOrder.tipo === "cotizacion" ? "Cotización" : "Venta"}</strong>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Fecha</span>
                      <strong>{selectedOrder.fecha}</strong>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Monto total</span>
                      <strong className={styles.highlight}>{selectedOrder.monto.toLocaleString()} L</strong>
                    </div>
                  </div>
                  <div className={styles.orderItemsCard}>
                    <h3>Items</h3>
                    <div className={styles.itemsList}>
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                          <span>{item.nombre}</span>
                          <div className={styles.itemMeta}>
                            <span>x{item.cantidad}</span>
                            <strong>{(item.precio * item.cantidad).toLocaleString()} L</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.orderActions}>
                  {selectedOrder.tipo === "cotizacion" && (selectedOrder.estado === "pendiente" || selectedOrder.estado === "en_proceso") && (
                    <>
                      <button type="button" className={styles.submit} onClick={() => handleOrderAction(selectedOrder.id, "aprobar")}>
                        <Check size={16} /> Aprobar cotización
                      </button>
                      <button type="button" className={styles.dangerBtn} onClick={() => handleOrderAction(selectedOrder.id, "rechazar")}>
                        <X size={16} /> Rechazar
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => handleOrderAction(selectedOrder.id, "cancelar")}>
                        Cancelar solicitud
                      </button>
                    </>
                  )}
                  <a
                    className={styles.primaryBtn}
                    href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Consulta sobre ${selectedOrder.id}`)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Send size={16} /> Consultar esta solicitud
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {requestModalOpen && (
          <div
            className={styles.overlay}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setRequestModalOpen(false);
            }}
          >
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Nueva solicitud">
              <header className={styles.modalHead}>
                <div>
                  <p className={styles.eyebrow}>Nueva</p>
                  <h2>Solicitar cotización</h2>
                </div>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setRequestModalOpen(false)}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </header>

              <form className={styles.form} onSubmit={handleSubmitRequest}>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    Tipo de solicitud
                    <select
                      value={requestForm.tipo}
                      onChange={(event) => setRequestForm({ ...requestForm, tipo: event.target.value })}
                    >
                      <option value="cotizacion">Cotización</option>
                      <option value="proyecto">Proyecto</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Urgencia
                    <select
                      value={requestForm.urgencia}
                      onChange={(event) => setRequestForm({ ...requestForm, urgencia: event.target.value })}
                    >
                      <option value="baja">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </label>
                  <label className={`${styles.field} ${styles.spanFull}`}>
                    Nombre del proyecto
                    <input
                      type="text"
                      value={requestForm.proyecto}
                      onChange={(event) => setRequestForm({ ...requestForm, proyecto: event.target.value })}
                      placeholder="Ej. Instalación fibra óptica edificio X"
                      required
                    />
                  </label>
                  <label className={`${styles.field} ${styles.spanFull}`}>
                    Descripción detallada
                    <textarea
                      value={requestForm.descripcion}
                      onChange={(event) => setRequestForm({ ...requestForm, descripcion: event.target.value })}
                      placeholder="Describe los detalles del proyecto, requerimientos técnicos, ubicación, etc."
                      rows={4}
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    Presupuesto estimado (L)
                    <input
                      type="number"
                      value={requestForm.presupuesto}
                      onChange={(event) => setRequestForm({ ...requestForm, presupuesto: event.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </label>
                </div>

                <footer className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => setRequestModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submit}>
                    <Send size={16} /> Enviar solicitud
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const TICKET_ESTADO_LABEL = {
  pendiente: "Abierto",
  en_proceso: "En proceso",
  completada: "Resuelto",
  cancelada: "Cerrado",
};

function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ asunto: "", mensaje: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/cliente-portal/soporte", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active && Array.isArray(data)) setTickets(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submitTicket(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/cliente-portal/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo crear el ticket.");
      setTickets((current) => [payload, ...current]);
      setForm({ asunto: "", mensaje: "" });
      sileo.success({ title: "Ticket creado", description: `Seguimiento disponible con el número ${payload.id}.` });
    } catch (error) {
      sileo.error({ title: error.message || "No se pudo crear el ticket." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.supportPage}>
      <h2>Soporte técnico</h2>
      <div className={styles.supportGrid}>
        <div className={styles.quickContact}>
          <h3>Contacto rápido</h3>
          <p>¿Necesitas ayuda inmediata? Contáctanos.</p>
          <div className={styles.contactMethods}>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.contactCard}>
              <span className={styles.contactIcon}>📧</span>
              <div>
                <strong>Email</strong>
                <p>{CONTACT_EMAIL}</p>
              </div>
            </a>
            <a href={CONTACT_PHONE_HREF} className={styles.contactCard}>
              <span className={styles.contactIcon}>📞</span>
              <div>
                <strong>Teléfono</strong>
                <p>{CONTACT_PHONE}</p>
              </div>
            </a>
          </div>
        </div>
        <div className={styles.ticketForm}>
          <h3>Abrir un ticket</h3>
          <p>Describe tu problema y el equipo de Arconet dará seguimiento desde aquí.</p>
          <form onSubmit={submitTicket}>
            <label className={styles.field}>
              Asunto
              <input
                type="text"
                value={form.asunto}
                onChange={(event) => setForm({ ...form, asunto: event.target.value })}
                placeholder="Ej. Problema con la entrega del proyecto X"
                maxLength={150}
                required
              />
            </label>
            <label className={styles.field}>
              Descripción
              <textarea
                value={form.mensaje}
                onChange={(event) => setForm({ ...form, mensaje: event.target.value })}
                placeholder="Cuéntanos qué ocurrió, cuándo y qué esperabas."
                rows={4}
                maxLength={2000}
                required
              />
            </label>
            <button type="submit" className={styles.submit} disabled={saving}>
              <Ticket size={16} /> {saving ? "Creando ticket..." : "Crear ticket"}
            </button>
          </form>
        </div>
      </div>
      <div className={styles.recentTickets}>
        <h3>Mis tickets</h3>
        {loading ? <p>Cargando tickets...</p> : tickets.length === 0 ? (
          <p>Aún no tienes tickets. Los que abras aparecerán aquí con su seguimiento.</p>
        ) : (
          <div className={styles.orderList}>
            {tickets.map((ticket) => (
              <article key={ticket.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <strong>{ticket.id}</strong>
                  <span className={`${styles.orderStatus} ${styles[`status_${ticket.estado}`] || ""}`}>
                    {TICKET_ESTADO_LABEL[ticket.estado] || ticket.estado}
                  </span>
                </div>
                <p>{ticket.detalle}</p>
                <div className={styles.orderMeta}>
                  <span>{new Date(ticket.fecha).toLocaleDateString("es-HN")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/cliente-portal/documentos", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data?.error || "No se pudieron cargar los documentos.");
        setDocs(Array.isArray(data) ? data : []);
      })
      .catch((err) => { if (active) setError(err.message || "No se pudieron cargar los documentos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className={styles.documentsPage}>
      <h2>Documentos</h2>
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p>Cargando documentos...</p> : docs.length === 0 ? (
        <p>Aún no tienes documentos disponibles. Aquí verás tus cotizaciones aprobadas y facturas en cuanto existan.</p>
      ) : (
        <div className={styles.orderList}>
          {docs.map((doc) => (
            <article key={doc.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <strong><FileText size={14} style={{ verticalAlign: -2 }} /> {doc.nombre}</strong>
                <span className={`${styles.orderStatus} ${styles[`status_${doc.estado}`] || ""}`}>
                  {doc.tipo === "factura" ? "Factura" : "Cotización"}
                </span>
              </div>
              <div className={styles.orderMeta}>
                <span>{new Date(doc.fecha).toLocaleDateString("es-HN")}</span>
                <strong>{doc.monto.toLocaleString("es-HN")} L</strong>
              </div>
              <a
                className={styles.viewBtn}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                <Download size={14} /> Ver / descargar PDF
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage({ session, onSessionUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    contacto: session.contacto || "",
    telefono: session.telefono || "",
    ciudad: session.ciudad || "",
    direccion: session.direccion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (campo) => (event) => {
    setForm((current) => ({ ...current, [campo]: event.target.value }));
    if (error) setError("");
  };

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/cliente-portal/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el perfil.");
      onSessionUpdate((current) => ({ ...current, ...payload }));
      setEditing(false);
      sileo.success({ title: "Perfil actualizado" });
    } catch (err) {
      setError(err.message || "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.profilePage}>
      <h2>Mi perfil</h2>
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <span className={styles.profileAvatar}>{session.nombre[0]}</span>
          <div>
            <strong>{session.nombre}</strong>
            <p>{session.correo}</p>
          </div>
          {!editing && (
            <button type="button" className={styles.ghostBtn} onClick={() => setEditing(true)} style={{ marginLeft: "auto" }}>
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <form className={styles.securityForm} onSubmit={save} noValidate>
            <label className={styles.field}>
              Nombre de contacto
              <input type="text" value={form.contacto} onChange={update("contacto")} maxLength={120} />
            </label>
            <label className={styles.field}>
              Teléfono
              <input type="tel" value={form.telefono} onChange={update("telefono")} maxLength={120} />
            </label>
            <label className={styles.field}>
              Ciudad
              <input type="text" value={form.ciudad} onChange={update("ciudad")} maxLength={120} />
            </label>
            <label className={styles.field}>
              Dirección
              <input type="text" value={form.direccion} onChange={update("direccion")} maxLength={400} />
            </label>
            {error ? <p className={styles.securityError} role="alert">{error}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => { setEditing(false); setError(""); }}>
                Cancelar
              </button>
              <button type="submit" className={styles.submit} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.profileDetails}>
            <div className={styles.detailRow}>
              <span>Empresa</span>
              <strong>{session.empresa || session.nombre}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>RTN</span>
              <strong>{session.rtn || "—"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Contacto</span>
              <strong>{session.contacto || session.nombre || "—"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Teléfono</span>
              <strong>{session.telefono || "—"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Ciudad</span>
              <strong>{session.ciudad || "—"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Dirección</span>
              <strong>{session.direccion || "—"}</strong>
            </div>
          </div>
        )}
      </div>

      <SecurityCard session={session} />
    </div>
  );
}

function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/cliente-portal/notificaciones", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data)) setItems(data);
      } catch { /* silencioso */ }
    }
    load();
    const timer = setInterval(load, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const unread = items.filter((item) => !item.read).length;

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await fetch("/api/cliente-portal/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  return (
    <div className={styles.bellWrap}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 && <span className={styles.bellBadge}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className={styles.bellPanel} role="dialog" aria-label="Notificaciones">
          <header className={styles.bellHead}>
            <strong>Notificaciones</strong>
            {unread > 0 && (
              <button type="button" className={styles.linkBtn} onClick={markAllRead}>Marcar todas leídas</button>
            )}
          </header>
          {items.length === 0 ? (
            <p className={styles.bellEmpty}>No tienes notificaciones todavía.</p>
          ) : (
            <ul className={styles.bellList}>
              {items.slice(0, 20).map((item) => (
                <li key={item.id} className={item.read ? "" : styles.bellUnread}>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{new Date(item.createdAt).toLocaleString("es-HN")}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SecurityCard({ session }) {
  const [form, setForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fuerza = fuerzaPassword(form.nueva);

  const update = (campo) => (event) => {
    setForm((current) => ({ ...current, [campo]: event.target.value }));
    if (error) setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (form.nueva !== form.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const policy = validarPassword(form.nueva, { contexto: session.correo });
    if (!policy.ok) {
      setError(policy.error);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/cliente-auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: form.actual, nueva: form.nueva }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar la contraseña.");
      setForm({ actual: "", nueva: "", confirmar: "" });
      sileo.success({ title: "Contraseña actualizada", description: "Usa la nueva en tu próximo inicio de sesión." });
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.securityCard} aria-label="Seguridad de la cuenta">
      <header className={styles.securityHead}>
        <span className={styles.securityIcon}><ShieldCheck size={18} /></span>
        <div>
          <h3>Seguridad</h3>
          <p>Tu correo y tu contraseña de acceso al portal.</p>
        </div>
      </header>

      <div className={styles.securityStatus}>
        <span className={session.verificado ? styles.statusOk : styles.statusPending}>
          {session.verificado ? <Check size={14} /> : <MailWarning size={14} />}
          {session.verificado ? "Correo verificado" : "Correo sin verificar"}
        </span>
        <strong>{session.correo}</strong>
        {!session.verificado && <Link href="/verificar">Verificar ahora</Link>}
      </div>

      <form className={styles.securityForm} onSubmit={submit} noValidate>
        <p className={styles.securityLabel}><Lock size={14} /> Cambiar contraseña</p>

        <label className={styles.field}>
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.actual}
            onChange={update("actual")}
          />
        </label>

        <label className={styles.field}>
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            placeholder="Mínimo 12 caracteres"
            value={form.nueva}
            onChange={update("nueva")}
          />
        </label>

        <div className={styles.strength} data-level={fuerza} aria-live="polite">
          <span className={styles.strengthBars} aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <i key={level} className={level <= fuerza ? styles.on : ""} />
            ))}
          </span>
          <small>{form.nueva ? FUERZA_LABEL[fuerza] : "Usa números o símbolos además de letras."}</small>
        </div>

        <label className={styles.field}>
          Confirmar contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmar}
            onChange={update("confirmar")}
          />
        </label>

        {error ? <p className={styles.securityError} role="alert">{error}</p> : null}

        <button type="submit" className={styles.submit} disabled={saving}>
          <Lock size={15} /> {saving ? "Guardando..." : "Actualizar contraseña"}
        </button>
      </form>
    </section>
  );
}
