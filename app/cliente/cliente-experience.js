"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
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
  User,
  X,
} from "lucide-react";
import styles from "./cliente-experience.module.css";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from "../../lib/contact";
import { fuerzaPassword, validarPassword } from "../../lib/seguridad";
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

  const quoteOrders = orders.filter((order) => order.tipo === "cotizacion");
  const projectOrders = orders.filter((order) => ["aprobada", "en_proceso", "completada"].includes(order.estado));

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
                    <strong className={styles.statValue}>
                      {orders.reduce((sum, order) => sum + order.monto, 0).toLocaleString("es-HN")} L
                    </strong>
                    <span className={styles.statLabel}>Total</span>
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
                    <h3>¿Necesitas ayuda?</h3>
                    <p>Escríbenos y el equipo de Arconet dará seguimiento a tu solicitud.</p>
                    <a className={styles.submit} href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Solicitud de soporte Arconet")}`}>
                      <Send size={16} /> Contactar soporte
                    </a>
                  </div>
                </div>
                <div className={styles.recentTickets}>
                  <h3>Seguimiento</h3>
                  <p>Las solicitudes de soporte se gestionan por correo o teléfono.</p>
                </div>
              </div>
            )}

            {activeTab === "documentos" && (
              <div className={styles.documentsPage}>
                <h2>Documentos</h2>
                <p>Los documentos asociados a tu cuenta aparecerán aquí cuando Arconet los comparta.</p>
              </div>
            )}

            {activeTab === "perfil" && (
              <div className={styles.profilePage}>
                <h2>Mi perfil</h2>
                <div className={styles.profileCard}>
                  <div className={styles.profileHeader}>
                    <span className={styles.profileAvatar}>{session.nombre[0]}</span>
                    <div>
                      <strong>{session.nombre}</strong>
                      <p>{session.correo}</p>
                    </div>
                  </div>
                  <div className={styles.profileDetails}>
                    <div className={styles.detailRow}>
                      <span>RTN</span>
                      <strong>{session.rtn || "—"}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Contacto</span>
                      <strong>{session.contacto || "—"}</strong>
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
                </div>

                <SecurityCard session={session} />
              </div>
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
