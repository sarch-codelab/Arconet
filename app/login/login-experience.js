"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "./login-experience.module.css";
import { sileo } from "../toaster";

const CLIENT_SESSION_KEY = "arconet-client-session";

function loadClientSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLIENT_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn("Error cargando sesión de cliente", error);
  }
  return null;
}

function saveClientSession(client) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(client));
  } catch (error) {
    console.warn("Error guardando sesión de cliente", error);
  }
}

const DEMO_CLIENTS = [
  {
    id: "c-1",
    nombre: "Empresa TelecomHN",
    correo: "cliente@telecomhn.com",
    password: "demo123",
    rtn: "08011999000123",
    contacto: "Juan Pérez",
    telefono: "+504 2500-1234",
    direccion: "Bouvard del Norte, Tegucigalpa",
    ciudad: "Tegucigalpa",
  },
];

export default function LoginExperience() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  function submit(event) {
    event.preventDefault();
    const client = DEMO_CLIENTS.find(
      (c) => c.correo === email && c.password === password
    );
    if (!client) {
      sileo.error({ title: "Correo o contraseña incorrectos." });
      return;
    }
    saveClientSession(client);
    router.push("/cliente");
  }

  function fillDemo() {
    setEmail(DEMO_CLIENTS[0].correo);
    setPassword(DEMO_CLIENTS[0].password);
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.visual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 55vw"
            className={styles.visualImage}
          />
          <div className={styles.visualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}>
              <i /> Acceso de clientes · Arconet
            </p>
            <h1>
              Tu red, tus proyectos,
              <br />
              <em>en un solo lugar.</em>
            </h1>
            <p className={styles.lead}>
              Ingresa para dar seguimiento a tus solicitudes, cotizaciones y
              entregas de fibra óptica, CATV e infraestructura.
            </p>
          </div>

          <div className={styles.visualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.panel} aria-label="Formulario de acceso">
          <div className={styles.panelTop}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={15} /> Volver al inicio
            </Link>
            <span>HN · 2026</span>
          </div>

          <div className={styles.panelBody}>
            <header className={styles.panelHeader}>
              <p className={styles.sectionLabel}>Iniciar sesión</p>
              <h2>
                Bienvenido
                <br />
                <em>de nuevo.</em>
              </h2>
              <p className={styles.panelIntro}>
                Usa tu correo y contraseña para acceder a tu cuenta Arconet.
              </p>
            </header>

            <form className={styles.loginForm} onSubmit={submit}>
              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                Contraseña
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              <div className={styles.formRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Recordarme
                </label>
                <Link className={styles.textLink} href="/contacto">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button type="submit" className={styles.submit}>
                Ingresar a mi cuenta <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <div className={styles.demoBox}>
              <p>Credenciales de demostración</p>
              <div className={styles.demoCodes}>
                <code>{DEMO_CLIENTS[0].correo}</code>
                <code>{DEMO_CLIENTS[0].password}</code>
              </div>
              <button type="button" className={styles.ghostBtn} onClick={fillDemo}>
                Usar credenciales demo
              </button>
            </div>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <Link className={styles.ghost} href="/contacto">
              Solicitar acceso corporativo
            </Link>

            <p className={styles.panelFooter}>
              ¿Aún no tienes cuenta?{" "}
              <Link href="/registro">Crea una aquí</Link>
            </p>
          </div>

          <div className={styles.panelBottom}>
            <span>© 2026 Arconet, S.A.</span>
            <Link href="/terminos">Términos de uso</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ClientLoginView({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event) {
    event.preventDefault();
    const client = DEMO_CLIENTS.find(
      (c) => c.correo === email && c.password === password
    );
    if (!client) {
      sileo.error({ title: "Correo o contraseña incorrectos." });
      return;
    }
    onLogin(client);
  }

  function fillDemo() {
    setEmail(DEMO_CLIENTS[0].correo);
    setPassword(DEMO_CLIENTS[0].password);
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.visual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 55vw"
            className={styles.visualImage}
          />
          <div className={styles.visualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}>
              <i /> Acceso de clientes · Arconet
            </p>
            <h1>
              Tu red, tus proyectos,
              <br />
              <em>en un solo lugar.</em>
            </h1>
            <p className={styles.lead}>
              Ingresa para dar seguimiento a tus solicitudes, cotizaciones y
              entregas de fibra óptica, CATV e infraestructura.
            </p>
          </div>

          <div className={styles.visualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.panel} aria-label="Formulario de acceso">
          <div className={styles.panelTop}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={15} /> Volver al inicio
            </Link>
            <span>HN · 2026</span>
          </div>

          <div className={styles.panelBody}>
            <header className={styles.panelHeader}>
              <p className={styles.sectionLabel}>Iniciar sesión</p>
              <h2>
                Bienvenido
                <br />
                <em>de nuevo.</em>
              </h2>
              <p className={styles.panelIntro}>
                Usa tu correo y contraseña para acceder a tu cuenta Arconet.
              </p>
            </header>

            <form className={styles.loginForm} onSubmit={submit}>
              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                Contraseña
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              <div className={styles.formRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Recordarme
                </label>
                <Link className={styles.textLink} href="/contacto">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button type="submit" className={styles.submit}>
                Ingresar a mi cuenta <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <div className={styles.demoBox}>
              <p>Credenciales de demostración</p>
              <div className={styles.demoCodes}>
                <code>{DEMO_CLIENTS[0].correo}</code>
                <code>{DEMO_CLIENTS[0].password}</code>
              </div>
              <button type="button" className={styles.ghostBtn} onClick={fillDemo}>
                Usar credenciales demo
              </button>
            </div>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <Link className={styles.ghost} href="/contacto">
              Solicitar acceso corporativo
            </Link>

            <p className={styles.panelFooter}>
              ¿Aún no tienes cuenta?{" "}
              <Link href="/registro">Crea una aquí</Link>
            </p>
          </div>

          <div className={styles.panelBottom}>
            <span>© 2026 Arconet, S.A.</span>
            <Link href="/terminos">Términos de uso</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ClientDashboard({ session, onLogout }) {
  const [navOpen, setNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    tipo: "cotizacion",
    proyecto: "",
    descripcion: "",
    presupuesto: "",
    urgencia: "normal",
  });

  const MOCK_ORDERS = [
    {
      id: "o-1",
      tipo: "cotizacion",
      fecha: "2026-10-14",
      monto: 45000,
      estado: "pendiente",
      notas: "Proyecto de instalación zona norte",
      items: [
        { nombre: "Cable óptico 12 hilos", cantidad: 500, precio: 50 },
        { nombre: "Splitter 1x8", cantidad: 20, precio: 1250 },
      ],
    },
    {
      id: "o-2",
      tipo: "venta",
      fecha: "2026-10-12",
      monto: 12500,
      estado: "completada",
      notas: "Entrega en sucursal SPS",
      items: [
        { nombre: "Caja terminal FTTH", cantidad: 50, precio: 250 },
      ],
    },
    {
      id: "o-3",
      tipo: "cotizacion",
      fecha: "2026-10-08",
      monto: 87500,
      estado: "aprobada",
      notas: "Infraestructura completa hotel",
      items: [
        { nombre: "Cable óptico 12 hilos", cantidad: 1000, precio: 50 },
        { nombre: "Conector SC/APC", cantidad: 200, precio: 35 },
      ],
    },
  ];

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("orden-detalle");
  };

  const handleCreateRequest = () => {
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    // Aquí se enviaría la solicitud al backend
    setRequestModalOpen(false);
    setRequestForm({
      tipo: "cotizacion",
      proyecto: "",
      descripcion: "",
      presupuesto: "",
      urgencia: "normal",
    });
  };

  return (
    <main className={styles.clientDashboard}>
      <div className={styles.dashboardShell}>
        {navOpen && (
          <button
            type="button"
            className={styles.navScrim}
            onClick={() => setNavOpen(false)}
            aria-label="Cerrar menú"
          />
        )}

        <aside className={`${styles.clientSidebar} ${navOpen ? styles.navOpen : ""}`}>
          <div className={styles.sidebarHead}>
            <Link className={styles.logo} href="/" aria-label="Arconet, inicio">
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
            </Link>
            <span className={styles.logoTag}>Portal de clientes</span>
          </div>

          <nav className={styles.nav} aria-label="Secciones del portal">
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("dashboard"); setNavOpen(false); }}
            >
              <Building2 size={17} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "cotizaciones" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("cotizaciones"); setNavOpen(false); }}
            >
              <FileText size={17} />
              <span>Mis cotizaciones</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "proyectos" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("proyectos"); setNavOpen(false); }}
            >
              <Package size={17} />
              <span>Proyectos</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "soporte" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("soporte"); setNavOpen(false); }}
            >
              <Check size={17} />
              <span>Soporte</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "documentos" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("documentos"); setNavOpen(false); }}
            >
              <ArrowRight size={17} />
              <span>Documentos</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeTab === "perfil" ? styles.navActive : ""}`}
              onClick={() => { setActiveTab("perfil"); setNavOpen(false); }}
            >
              <User size={17} />
              <span>Mi perfil</span>
            </button>
          </nav>

          <div className={styles.sidebarFoot}>
            <div className={styles.userCard}>
              <span className={styles.userAvatar}>{session.nombre[0]}</span>
              <span className={styles.userMeta}>
                <strong>{session.nombre}</strong>
                <em>{session.correo}</em>
              </span>
            </div>
            <button type="button" className={styles.logoutBtn} onClick={onLogout}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <div className={styles.dashboardContent}>
          <header className={styles.dashboardTopbar}>
            <button
              type="button"
              className={styles.navToggle}
              onClick={() => setNavOpen((value) => !value)}
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
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
            {activeTab === "cotizaciones" && (
              <button type="button" className={styles.primaryBtn} onClick={handleCreateRequest}>
                <Plus size={16} /> Nueva solicitud
              </button>
            )}
          </header>

          <div className={styles.dashboardBody}>
            {activeTab === "dashboard" && (
              <div className={styles.dashboardGrid}>
                <section className={styles.welcomeCard}>
                  <h2>Bienvenido, {session.nombre}</h2>
                  <p>Gestiona tus cotizaciones y proyectos de infraestructura.</p>
                </section>

                <section className={styles.statsGrid}>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><FileText size={20} /></span>
                    <strong className={styles.statValue}>{MOCK_ORDERS.length}</strong>
                    <span className={styles.statLabel}>Cotizaciones</span>
                  </article>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><Check size={20} /></span>
                    <strong className={styles.statValue}>
                      {MOCK_ORDERS.filter((o) => o.estado === "completada").length}
                    </strong>
                    <span className={styles.statLabel}>Completadas</span>
                  </article>
                  <article className={styles.statCard}>
                    <span className={styles.statIcon}><Package size={20} /></span>
                    <strong className={styles.statValue}>
                      {MOCK_ORDERS.reduce((sum, o) => sum + o.monto, 0).toLocaleString()} L
                    </strong>
                    <span className={styles.statLabel}>Total</span>
                  </article>
                </section>

                <section className={styles.recentOrders}>
                  <h3>Cotizaciones recientes</h3>
                  <div className={styles.orderList}>
                    {MOCK_ORDERS.map((order) => (
                      <div key={order.id} className={styles.orderCard}>
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
                  {MOCK_ORDERS.map((order) => (
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
                  <div className={styles.projectCard}>
                    <div className={styles.projectHeader}>
                      <span className={styles.projectType}>Instalación</span>
                      <span className={`${styles.projectStatus} ${styles.status_en_proceso}`}>En proceso</span>
                    </div>
                    <h3>Infraestructura Zona Norte</h3>
                    <p>Proyecto de instalación de fibra óptica para zona residencial norte.</p>
                    <div className={styles.projectMeta}>
                      <span><Clock size={14} /> Inicio: 14 Oct 2026</span>
                      <span><Package size={14} /> 5/10 entregas</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: "50%" }}></div>
                    </div>
                  </div>
                  <div className={styles.projectCard}>
                    <div className={styles.projectHeader}>
                      <span className={styles.projectType}>Mantenimiento</span>
                      <span className={`${styles.projectStatus} ${styles.status_pendiente}`}>Pendiente</span>
                    </div>
                    <h3>Actualización CATV Centro</h3>
                    <p>Actualización de infraestructura de televisión por cable centro.</p>
                    <div className={styles.projectMeta}>
                      <span><Clock size={14} /> Programado: 20 Oct 2026</span>
                      <span><Package size={14} /> 0/5 entregas</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: "0%" }}></div>
                    </div>
                  </div>
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
                      <a href="mailto:soporte@arconet.com" className={styles.contactCard}>
                        <span className={styles.contactIcon}>📧</span>
                        <div>
                          <strong>Email</strong>
                          <p>soporte@arconet.com</p>
                        </div>
                      </a>
                      <a href="tel:+50425000000" className={styles.contactCard}>
                        <span className={styles.contactIcon}>📞</span>
                        <div>
                          <strong>Teléfono</strong>
                          <p>+504 2500-0000</p>
                        </div>
                      </a>
                    </div>
                  </div>
                  <div className={styles.ticketForm}>
                    <h3>Crear ticket de soporte</h3>
                    <form className={styles.form}>
                      <label className={styles.field}>
                        Asunto
                        <input type="text" placeholder="Describe tu problema" />
                      </label>
                      <label className={styles.field}>
                        Prioridad
                        <select>
                          <option value="baja">Baja</option>
                          <option value="normal">Normal</option>
                          <option value="alta">Alta</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        Descripción
                        <textarea rows={4} placeholder="Detalla tu solicitud..." />
                      </label>
                      <button type="submit" className={styles.submit}>
                        <Send size={16} /> Enviar ticket
                      </button>
                    </form>
                  </div>
                </div>
                <div className={styles.recentTickets}>
                  <h3>Tickets recientes</h3>
                  <div className={styles.ticketList}>
                    <div className={styles.ticketCard}>
                      <div className={styles.ticketHeader}>
                        <strong>#TKT-001</strong>
                        <span className={`${styles.ticketStatus} ${styles.status_abierto}`}>Abierto</span>
                      </div>
                      <p>Problema con conexión en edificio central</p>
                      <span className={styles.ticketDate}>14 Oct 2026</span>
                    </div>
                    <div className={styles.ticketCard}>
                      <div className={styles.ticketHeader}>
                        <strong>#TKT-002</strong>
                        <span className={`${styles.ticketStatus} ${styles.status_resuelto}`}>Resuelto</span>
                      </div>
                      <p>Solicitud de cambio de dirección de facturación</p>
                      <span className={styles.ticketDate}>10 Oct 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documentos" && (
              <div className={styles.documentsPage}>
                <h2>Documentos</h2>
                <div className={styles.docGrid}>
                  <div className={styles.docCard}>
                    <span className={styles.docIcon}>📄</span>
                    <div className={styles.docInfo}>
                      <strong>Factura Octubre 2026</strong>
                      <p>FAC-2026-10-001</p>
                      <span className={styles.docDate}>14 Oct 2026</span>
                    </div>
                    <button type="button" className={styles.downloadBtn}>
                      <Download size={16} />
                    </button>
                  </div>
                  <div className={styles.docCard}>
                    <span className={styles.docIcon}>📋</span>
                    <div className={styles.docInfo}>
                      <strong>Cotización #o-1</strong>
                      <p>Proyecto instalación zona norte</p>
                      <span className={styles.docDate}>14 Oct 2026</span>
                    </div>
                    <button type="button" className={styles.downloadBtn}>
                      <Download size={16} />
                    </button>
                  </div>
                  <div className={styles.docCard}>
                    <span className={styles.docIcon}>📑</span>
                    <div className={styles.docInfo}>
                      <strong>Contrato de servicio</strong>
                      <p>Contrato anual fibra óptica</p>
                      <span className={styles.docDate}>01 Ene 2026</span>
                    </div>
                    <button type="button" className={styles.downloadBtn}>
                      <Download size={16} />
                    </button>
                  </div>
                  <div className={styles.docCard}>
                    <span className={styles.docIcon}>📊</span>
                    <div className={styles.docInfo}>
                      <strong>Reporte mensual Sept</strong>
                      <p>Resumen de consumo y actividad</p>
                      <span className={styles.docDate}>30 Sep 2026</span>
                    </div>
                    <button type="button" className={styles.downloadBtn}>
                      <Download size={16} />
                    </button>
                  </div>
                </div>
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
                  <button type="button" className={styles.primaryBtn}>
                    <Download size={16} /> Descargar PDF
                  </button>
                  {selectedOrder.estado === "pendiente" && (
                    <button type="button" className={styles.secondaryBtn}>
                      <Send size={16} /> Aprobar cotización
                    </button>
                  )}
                </div>
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
