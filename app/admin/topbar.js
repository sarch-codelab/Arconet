"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ExternalLink, HelpCircle, LogOut, Search, User, MessageSquare, AlertTriangle, CheckCircle, X } from "lucide-react";
import { sileo } from "../toaster";
import { AdminContext, NAV } from "./admin-nav";
import { canAccessSection } from '@/lib/permisos";
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
  chromeOnly = false,
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
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [photo, setPhoto] = useState("");
  const [photoFailed, setPhotoFailed] = useState(false);
  const mobileSearchInputRef = useRef(null);
  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationsButtonRef = useRef(null);

  useEffect(() => {
    if (searchVal.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return undefined;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchVal.trim())}`, { cache: "no-store" });
        const payload = await response.json().catch(() => []);
        if (!cancelled) {
          setSearchResults(Array.isArray(payload) ? payload : []);
          setSearchOpen(true);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 240);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchVal]);

  useEffect(() => {
    if (!currentSession?.correo) return undefined;
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notificaciones", { cache: "no-store" });
        const data = await response.json().catch(() => []);
        if (active && response.ok) setNotifications(Array.isArray(data) ? data : []);
      } catch {}
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [currentSession?.correo]);

  // La foto del perfil se lee del servidor para que la cabecera muestre la
  // última guardada, sin depender de la lista de trabajadores cargada al
  // iniciar. Se refresca al guardar «Mi perfil».
  useEffect(() => {
    if (!currentSession?.correo) return undefined;
    let active = true;
    const loadPhoto = async () => {
      try {
        const response = await fetch("/api/perfil", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setPhoto(data?.trabajador?.foto || data?.foto || "");
        setPhotoFailed(false);
      } catch {}
    };
    loadPhoto();
    const onUpdated = () => loadPhoto();
    window.addEventListener("arconet:profile-updated", onUpdated);
    return () => {
      active = false;
      window.removeEventListener("arconet:profile-updated", onUpdated);
    };
  }, [currentSession?.correo]);

  const avatarSrc = !photoFailed ? photo || myWorker?.foto || "" : "";

  // En el teléfono las hojas son modales: se bloquea el scroll de la página
  // de fondo para que no se mueva detrás del dedo.
  useEffect(() => {
    if (!accountOpen && !notificationsOpen) return undefined;
    if (typeof window === "undefined") return undefined;
    if (!window.matchMedia?.("(max-width: 900px)")?.matches) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [accountOpen, notificationsOpen]);

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

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "unread") return notifications.filter(n => !n.read);
    if (notificationFilter === "read") return notifications.filter(n => n.read);
    return notifications;
  }, [notifications, notificationFilter]);

  const markNotificationRead = async (notification) => {
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id }) }).catch(() => {});
    closeNotifications();
    if (notification.solicitudId) adminCtx?.goTo?.("solicitudes");
  };

  // Contenido compartido por el buscador de escritorio y el de móvil.
  const searchResultsContent = searchLoading ? (
    <p className={styles.globalSearchEmpty}>Buscando en tus datos…</p>
  ) : searchResults.length ? (
    searchResults.map((result) => (
      <button key={`${result.section}-${result.id}`} type="button" role="option" aria-selected="false" onClick={() => { adminCtx?.goTo?.(result.section); setSearchOpen(false); setMobileSearchOpen(false); }}>
        <strong>{result.title}</strong><span>{result.detail}</span><small>{result.sectionLabel}</small>
      </button>
    ))
  ) : (
    <p className={styles.globalSearchEmpty}>Sin resultados. Prueba con el nombre, SKU, RTN o correo completo del registro.</p>
  );

  const markAllNotificationsRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => {});
    showToast("Notificaciones marcadas como leídas", "success");
  };

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
          {NAV.filter((item) => canAccessSection(currentSession?.permisos, item.id)).map((item) => {
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
          {/* En pantallas pequeñas el buscador no cabe: se abre con este botón
              y la barra aparece debajo de la fila de secciones. */}
          <button
            type="button"
            className={styles.searchToggle}
            onClick={() => {
              setMobileSearchOpen((open) => {
                if (!open) window.setTimeout(() => mobileSearchInputRef.current?.focus(), 40);
                return !open;
              });
            }}
            aria-label={mobileSearchOpen ? "Cerrar buscador" : "Abrir buscador"}
            aria-expanded={mobileSearchOpen}
            aria-controls="admin-mobile-search"
            title="Buscar"
          >
            <Search size={17} />
          </button>
          <div className={styles.searchPill}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Buscar..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults[0]) {
                  adminCtx?.goTo?.(searchResults[0].section);
                  setSearchOpen(false);
                } else if (e.key === "Escape") setSearchOpen(false);
              }}
              onFocus={() => { if (searchVal.trim().length >= 2) setSearchOpen(true); }}
              aria-expanded={searchOpen}
              aria-controls="admin-global-search-results"
              className={styles.searchInput}
              aria-label={`Buscar en ${title}`}
            />
            {searchOpen && (
              <div className={styles.globalSearchResults} id="admin-global-search-results" role="listbox" aria-label="Resultados de búsqueda">
                {searchResultsContent}
              </div>
            )}
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
                      <p>Aún no tienes notificaciones.</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const Icon = notif.type === "solicitud" ? MessageSquare : CheckCircle;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          role="menuitem"
                          className={`${styles.notificationItem} ${!notif.read ? styles.notificationUnread : ""}`}
                          onClick={() => markNotificationRead(notif)}
                        >
                          <span className={styles.notificationIcon}>
                            <Icon size={16} />
                          </span>
                          <div className={styles.notificationContent}>
                            <p className={styles.notificationTitle}>{notif.title}</p>
                            <p className={styles.notificationMessage}>{notif.message}</p>
                            <time className={styles.notificationTime}>{new Date(notif.createdAt).toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" })}</time>
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
                    disabled={unreadCount === 0}
                    onClick={markAllNotificationsRead}
                  >
                    Marcar todas como leídas
                  </button>
                  <button
                    type="button"
                    className={styles.notificationsViewAll}
                      disabled={notifications.length === 0}
                    onClick={() => setNotificationFilter("all")}
                  >
                    Ver todas las notificaciones
                  </button>
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
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  width={40}
                  height={40}
                  onError={() => setPhotoFailed(true)}
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
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt=""
                        width={44}
                        height={44}
                        onError={() => setPhotoFailed(true)}
                      />
                    ) : (
                      <span className={styles.avatarFallback}>{currentSession?.nombre ? currentSession.nombre.charAt(0).toUpperCase() : "A"}</span>
                    )}
                  </span>
                  <span className={styles.accountIdentity}>
                    <strong>{currentSession?.nombre || "Administrador"}</strong>
                    <span>{currentSession?.rolNombre || "Administrador"}</span>
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

      {/* Velo para las hojas de cuenta/notificaciones en el teléfono: cierra al
          tocar fuera y evita que la página se lea por detrás. */}
      {(accountOpen || notificationsOpen) && (
        <button
          type="button"
          className={styles.sheetBackdrop}
          aria-label="Cerrar menú"
          onClick={() => { setAccountOpen(false); setNotificationsOpen(false); }}
        />
      )}

      {mobileSearchOpen && (
        <div className={styles.mobileSearch} id="admin-mobile-search">
          <div className={styles.mobileSearchField}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={mobileSearchInputRef}
              type="search"
              placeholder="Buscar productos, clientes, órdenes…"
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  adminCtx?.goTo?.(searchResults[0].section);
                  setSearchOpen(false);
                  setMobileSearchOpen(false);
                } else if (event.key === "Escape") {
                  setSearchOpen(false);
                  setMobileSearchOpen(false);
                }
              }}
              aria-label="Buscar en el panel"
            />
            <button
              type="button"
              className={styles.mobileSearchClose}
              onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }}
              aria-label="Cerrar buscador"
            >
              <X size={16} />
            </button>
          </div>
          {searchOpen && (
            <div className={styles.globalSearchResults} role="listbox" aria-label="Resultados de búsqueda">
              {searchResultsContent}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          2. SUB-BARRA DE SECCION (Titulo, subtitulo y accion)

          `chromeOnly` renderiza solo la barra global (logo, pildora de
          secciones, buscador, notificaciones y perfil). Se usa en secciones
          unificadas como Ventas, donde cada pestana interna ya aporta su
          propio titulo/acciones dentro del cuerpo; sin esto, al pasar el
          control de la cabecera a la seccion padre desaparecia toda la parte
          superior del panel. */}
      {!chromeOnly && (
        <div className={styles.sectionSubBar}>
          <div className={styles.topbarTitle}>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action && <div className={styles.topbarActions}>{action}</div>}
        </div>
      )}

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
