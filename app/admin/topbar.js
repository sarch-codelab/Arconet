"use client";

import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ExternalLink, HelpCircle, LogOut, Search, User, MessageSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { sileo } from "../toaster";
import { AdminContext, NAV } from "./admin-nav";
import { roleLabel } from "./workers-store";
import styles from "./admin-experience.module.css";

/**
 * Desplaza la barra de pildoras hasta la pildora activa.
 *
 * En celular y tableta no caben todas las secciones, asi que la barra hace
 * scroll horizontal; sin este ajuste la pestana activa podia quedar fuera de
 * la vista y el usuario no sabia donde estaba. Respeta `prefers-reduced-motion`.
 */
function useActivePillIntoView(activeKey) {
  const navRef = useRef(null);

  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current]');
    if (!active) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    active.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [activeKey]);

  return navRef;
}

/**
 * Cabecera global del panel administrativo.
 *
 * Se comparte entre todas las secciones (incluida Flota) para que la
 * navegacion, la cabecera pegajosa, el buscador y la barra de progreso
 * se comporten igual en todo el panel.
 *
 * La pildora central replica las secciones de la barra lateral, de modo que
 * cambiar de pagina se hace desde aqui y no desde el menu lateral.
 */
export function Topbar({
  title,
  subtitle,
  action,
  session,
  workers = [],
}) {
  const adminCtx = useContext(AdminContext);
  const activeSection = adminCtx?.section || "trabajadores";
  const pillNavRef = useActivePillIntoView(activeSection);
  const ctxSession = adminCtx?.session;

  const currentSession = session || ctxSession;

  const myWorker = useMemo(() => {
    if (!currentSession?.correo) return null;
    return workers.find((w) => w.correo?.toLowerCase() === currentSession.correo.toLowerCase()) || null;
  }, [workers, currentSession?.correo]);

  const [searchVal, setSearchVal] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationsButtonRef = useRef(null);

  // El menu de cuenta se cierra al pulsar fuera, al pulsar Escape y al
  // cambiar de seccion.
  useEffect(() => {
    if (!accountOpen && !notificationsOpen) return undefined;
    const onPointerDown = (event) => {
      if (accountOpen && accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (accountOpen) {
          setAccountOpen(false);
          accountButtonRef.current?.focus();
        }
        if (notificationsOpen) {
          setNotificationsOpen(false);
          notificationsButtonRef.current?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, notificationsOpen]);

  useEffect(() => {
    setAccountOpen(false);
    setNotificationsOpen(false);
  }, [activeSection]);

  const closeAccount = () => setAccountOpen(false);
  const closeNotifications = () => setNotificationsOpen(false);

  const showToast = (msg, type = "info") => {
    if (msg) sileo.show({ type, title: String(msg) });
  };

  // Mock notifications data
  const notifications = useMemo(() => [
    { id: 1, type: "nuevo_trabajador", title: "Nuevo trabajador registrado", message: "José Pérez se ha unido como Técnico en San Pedro Sula", time: "Hace 15 min", read: false },
    { id: 2, type: "stock_bajo", title: "Stock bajo detectado", message: "Splitter óptico 1x8 PLC - Quedan 3 unidades", time: "Hace 1 hora", read: false },
    { id: 3, type: "cotizacion", title: "Cotización aprobada", message: "Cotización #CO-2024-0145 aprobada por el cliente TelecomHN", time: "Hace 3 horas", read: true },
    { id: 4, type: "sistema", title: "Backup completado", message: "Copia de seguridad diaria completada exitosamente", time: "Ayer", read: true },
    { id: 5, type: "flota", title: "Vehículo en mantenimiento", message: "Camión FL-003 programado para mantenimiento preventivo", time: "Ayer", read: true },
  ], []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "unread") return notifications.filter(n => !n.read);
    if (notificationFilter === "read") return notifications.filter(n => n.read);
    return notifications;
  }, [notifications, notificationFilter]);

  // Simulación de notificaciones en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newNotif = {
          id: Date.now(),
          type: ["nuevo_trabajador", "stock_bajo", "cotizacion", "sistema", "flota"][Math.floor(Math.random() * 5)],
          title: "Nueva notificación",
          message: "Este es un mensaje de notificación en tiempo real",
          time: "Ahora",
          read: false,
        };
        notifications.unshift(newNotif);
        showToast("Nueva notificación recibida", "info");
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className={styles.topbarContainer}>
      {/* ==============================================================
          1. BARRA GLOBAL (Marca | Secciones | Buscador y acciones)
          ============================================================== */}
      <div className={styles.globalTopBar}>
        <div className={styles.brandArea}>
          <Link href="/" className={styles.topbarBrand} title="Arconet, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arconet.png"
              alt="Arconet"
              className={styles.topbarBrandImg}
            />
          </Link>
        </div>

        {/* Pildora de navegacion: replica las secciones de la barra lateral
            (Trabajadores, Productos, Flota, etc.) para cambiar de pagina sin
            salir de la cabecera. La activa muestra icono + texto y las
            hermanas solo icono, para no saturarla. */}
        <nav
          className={styles.centerPillNav}
          aria-label="Secciones del panel"
          ref={pillNavRef}
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? `${styles.pillItem} ${styles.pillItemActive}` : styles.pillIconOnly}
                onClick={() => adminCtx?.goTo?.(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={15} />
                {isActive ? <span>{item.label}</span> : null}
              </button>
            );
          })}
        </nav>

        {/* Buscador, notificaciones y perfil */}
        <div className={styles.rightActions}>
          <div className={styles.searchPill}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Buscar..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchVal.trim()) {
                  showToast(`Buscando "${searchVal.trim()}" en ${title}...`);
                }
              }}
              className={styles.searchInput}
              aria-label={`Buscar en ${title}`}
            />
          </div>
          <div className={styles.notificationsMenu} ref={notificationsRef}>
            <button
              type="button"
              ref={notificationsButtonRef}
              className={styles.notifBtn}
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Notificaciones"
              aria-haspopup="menu"
              aria-expanded={notificationsOpen}
              aria-controls="panel-notifications-menu"
              title="Notificaciones"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className={styles.notificationsPanel}
                id="panel-notifications-menu"
                role="menu"
                aria-label="Notificaciones"
              >
                <div className={styles.notificationsHead}>
                  <h3>Notificaciones</h3>
                  <div className={styles.notificationsFilters}>
                    <button
                      type="button"
                      className={`${styles.notificationsFilter} ${notificationFilter === "all" ? styles.notificationsFilterActive : ""}`}
                      onClick={() => setNotificationFilter("all")}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      className={`${styles.notificationsFilter} ${notificationFilter === "unread" ? styles.notificationsFilterActive : ""}`}
                      onClick={() => setNotificationFilter("unread")}
                    >
                      No leídas
                    </button>
                    <button
                      type="button"
                      className={`${styles.notificationsFilter} ${notificationFilter === "read" ? styles.notificationsFilterActive : ""}`}
                      onClick={() => setNotificationFilter("read")}
                    >
                      Leídas
                    </button>
                  </div>
                </div>

                <div className={styles.notificationsList}>
                  {filteredNotifications.length === 0 ? (
                    <div className={styles.notificationsEmpty}>
                      <Bell size={32} />
                      <p>No hay notificaciones</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const Icon = notif.type === "nuevo_trabajador" ? User :
                                   notif.type === "stock_bajo" ? AlertTriangle :
                                   notif.type === "cotizacion" ? MessageSquare :
                                   notif.type === "flota" ? AlertTriangle : CheckCircle;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          role="menuitem"
                          className={`${styles.notificationItem} ${!notif.read ? styles.notificationUnread : ""}`}
                          onClick={closeNotifications}
                        >
                          <span className={styles.notificationIcon}>
                            <Icon size={16} />
                          </span>
                          <div className={styles.notificationContent}>
                            <p className={styles.notificationTitle}>{notif.title}</p>
                            <p className={styles.notificationMessage}>{notif.message}</p>
                            <time className={styles.notificationTime}>{notif.time}</time>
                          </div>
                          {!notif.read && <span className={styles.notificationDot} />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className={styles.notificationsFooter}>
                  <button
                    type="button"
                    className={styles.notificationsMarkAll}
                    onClick={() => {
                      showToast("Todas las notificaciones marcadas como leídas", "success");
                      closeNotifications();
                    }}
                  >
                    Marcar todas como leídas
                  </button>
                  <Link href="#" className={styles.notificationsViewAll} onClick={closeNotifications}>
                    Ver todas las notificaciones
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className={styles.accountMenu} ref={accountRef}>
            <button
              type="button"
              ref={accountButtonRef}
              className={styles.profileAvatar}
              onClick={() => setAccountOpen((value) => !value)}
              title={currentSession?.nombre || "Administrador"}
              aria-label={`Opciones de la cuenta de ${currentSession?.nombre || "Administrador"}`}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="panel-account-menu"
            >
              {myWorker?.foto ? (
                <Image
                  src={myWorker.foto}
                  alt=""
                  width={40}
                  height={40}
                  priority
                />
              ) : (
                <span className={styles.avatarFallback}>{currentSession?.nombre ? currentSession.nombre.charAt(0).toUpperCase() : "A"}</span>
              )}
            </button>

            {accountOpen && (
              <div
                className={styles.accountPanel}
                id="panel-account-menu"
                role="menu"
                aria-label="Opciones de la cuenta"
              >
                <div className={styles.accountHead}>
                  <span className={styles.accountAvatar}>
                    {myWorker?.foto ? (
                      <Image
                        src={myWorker.foto}
                        alt=""
                        width={44}
                        height={44}
                        priority
                      />
                    ) : (
                      <span className={styles.avatarFallback}>{currentSession?.nombre ? currentSession.nombre.charAt(0).toUpperCase() : "A"}</span>
                    )}
                  </span>
                  <span className={styles.accountIdentity}>
                    <strong>{currentSession?.nombre || "Administrador"}</strong>
                    <span>{currentSession?.rol ? roleLabel(currentSession.rol) : "Administrador"}</span>
                    {currentSession?.correo ? <em>{currentSession.correo}</em> : null}
                    {currentSession?.sucursal ? <em>{currentSession.sucursal}</em> : null}
                  </span>
                </div>

                <div className={styles.accountDivider} />

                <button
                  type="button"
                  role="menuitem"
                  className={styles.accountItem}
                  onClick={() => {
                    closeAccount();
                    adminCtx?.goTo?.("mi-perfil");
                  }}
                >
                  <User size={16} aria-hidden="true" />
                  <span>Mi perfil</span>
                </button>

                <Link
                  role="menuitem"
                  className={styles.accountItem}
                  href="/contacto"
                  onClick={closeAccount}
                >
                  <HelpCircle size={16} aria-hidden="true" />
                  <span>Ayuda y soporte</span>
                </Link>

                <Link
                  role="menuitem"
                  className={styles.accountItem}
                  href="/"
                  onClick={closeAccount}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  <span>Ver el sitio público</span>
                </Link>

                <div className={styles.accountDivider} />

                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.accountItem} ${styles.accountLogout}`}
                  onClick={() => {
                    closeAccount();
                    adminCtx?.onLogout?.();
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==============================================================
          2. SUB-BARRA DE SECCION (Titulo, subtitulo y accion)
          ============================================================== */}
      <div className={styles.sectionSubBar}>
        <div className={styles.topbarTitle}>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action && <div className={styles.topbarActions}>{action}</div>}
      </div>

      {/* Indicador de avance de lectura del panel */}
      <div className={styles.scrollProgress} aria-hidden="true">
        <span className={styles.scrollProgressBar} />
      </div>
    </header>
  );
}

/**
 * Fila de sub-filtros de una seccion.
 *
 * La cabecera quedo reservada a la navegacion entre secciones del panel, asi
 * que los tabs propios de cada area (estado, sede, tipo de registro, vista)
 * se muestran aqui, al inicio del cuerpo de la seccion. Reutiliza el lenguaje
 * de pildoras de la cabecera para que la transicion se sienta continua.
 */
export function SectionTabs({ tabs, activeTab, onTabChange, label = "Filtros de la sección" }) {
  const tabsRef = useActivePillIntoView(activeTab);

  if (!tabs?.length) return null;

  return (
    <nav className={styles.sectionTabs} aria-label={label} ref={tabsRef}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? `${styles.pillItem} ${styles.pillItemActive}` : styles.pillItem}
            onClick={() => onTabChange?.(tab.id)}
            title={tab.title || tab.label}
            aria-current={isActive ? "true" : undefined}
          >
            {Icon ? <Icon size={15} /> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
