"use client";

import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ExternalLink, HelpCircle, LogOut, Menu, Search, User, MessageSquare, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { sileo } from "../toaster";
import { AdminContext, SECTION_NAV_CONFIG } from "./admin-nav";
import { roleLabel } from "./workers-store";
import styles from "./admin-experience.module.css";

/**
 * Cabecera global del panel administrativo.
 *
 * Se comparte entre todas las secciones (incluida Flota) para que la
 * navegacion, la cabecera pegajosa, el buscador y la barra de progreso
 * se comporten igual en todo el panel.
 */
export function Topbar({
  title,
  subtitle,
  action,
  onOpenNav,
  activeTab: controlledTab,
  onTabChange,
  customTabs,
  onTabSelect,
  session,
  workers = [],
}) {
  const adminCtx = useContext(AdminContext);
  const activeSection = adminCtx?.section || "trabajadores";
  const handleOpenNav = onOpenNav || adminCtx?.onOpenNav;
  const navOpen = adminCtx?.navOpen ?? false;
  const ctxSession = adminCtx?.session;

  const currentSession = session || ctxSession;

  const myWorker = useMemo(() => {
    if (!currentSession?.correo) return null;
    return workers.find((w) => w.correo?.toLowerCase() === currentSession.correo.toLowerCase()) || null;
  }, [workers, currentSession?.correo]);

  const [internalTab, setInternalTab] = useState("all");
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
  }, []);

  const sectionConfig = SECTION_NAV_CONFIG[activeSection] || SECTION_NAV_CONFIG.trabajadores;
  const tabs = customTabs || sectionConfig.tabs;
  const currentTabId = controlledTab !== undefined ? controlledTab : internalTab;

  const handleSelectTab = (tabId) => {
    if (onTabSelect) {
      onTabSelect(tabId);
      return;
    }
    if (controlledTab === undefined) {
      setInternalTab(tabId);
    }
    onTabChange?.(tabId);
    const tabObj = tabs.find((t) => t.id === tabId);
    if (tabObj) {
      showToast(`${tabObj.title || tabObj.label} activo`);
    }
  };

  const activeTabObj = tabs.find((t) => t.id === currentTabId) || tabs[0];
  const ActiveIcon = activeTabObj?.icon;

  const showToast = (msg, type = "info") => {
    if (msg) sileo.show({ type, title: String(msg) });
  };

  return (
    <header className={styles.topbarContainer}>
      {/* ==============================================================
          1. BARRA GLOBAL (Marca | Pildoras | Buscador y acciones)
          ============================================================== */}
      <div className={styles.globalTopBar}>
        <div className={styles.brandArea}>
          {handleOpenNav && (
            <button
              type="button"
              className={styles.navToggleBtn}
              onClick={handleOpenNav}
              aria-label={navOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
              aria-expanded={navOpen}
              title={navOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
            >
              <Menu size={18} />
            </button>
          )}
          <Link href="/" className={styles.topbarBrand} title="Arconet, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arconet.png"
              alt="Arconet"
              className={styles.topbarBrandImg}
            />
          </Link>
        </div>

        {/* Pildora de navegacion: la activa muestra icono + texto y las
            hermanas solo icono, para no saturar la cabecera. */}
        <nav className={styles.centerPillNav} aria-label={`Navegación de ${title}`}>
          <button
            type="button"
            className={`${styles.pillItem} ${styles.pillItemActive}`}
            onClick={() => handleSelectTab(activeTabObj.id)}
            title={activeTabObj.title || activeTabObj.label}
            aria-current="true"
          >
            {ActiveIcon ? <ActiveIcon size={15} /> : null}
            <span>{activeTabObj.label}</span>
          </button>

          {tabs
            .filter((t) => t.id !== activeTabObj.id)
            .map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={styles.pillIconOnly}
                  onClick={() => handleSelectTab(tab.id)}
                  title={tab.title || tab.label}
                  aria-label={tab.label}
                >
                  {TabIcon ? <TabIcon size={16} /> : null}
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
