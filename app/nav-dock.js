"use client";

// Dock de navegación secundaria (menú 2 del home) compartido. Misma cápsula,
// misma navegación con indicador y mega menú; el `variant` define cómo se
// muestra:
//   - "scroll": fija al viewport, oculta hasta superar el hero (home).
//   - "fixed":  fija al viewport y siempre visible, sin aparecer al hacer
//     scroll (páginas de categoría).
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, LogIn, ShieldCheck, X } from "lucide-react";
import { NAVIGATION } from "./navigation-data";
import { useThemeMode } from "./theme-toggle";
import styles from "./nav-dock.module.css";

export default function NavDock({
  variant = "scroll",
  visible = false,
  activeId,
  navigation = NAVIGATION,
  cartAction = null,
  topbarRef,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const internalTopbarRef = useRef(null);
  const dockRef = topbarRef ?? internalTopbarRef;
  const navRef = useRef(null);
  const menuToggleRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const accederTimer = useRef(null);
  const { label: themeLabel, Icon: ThemeIcon, cycle: cycleTheme } = useThemeMode();

  const abrirAcceder = useCallback(() => {
    if (accederTimer.current) clearTimeout(accederTimer.current);
    setAccessOpen(true);
  }, []);

  const programarCierreAcceder = useCallback(() => {
    if (accederTimer.current) clearTimeout(accederTimer.current);
    accederTimer.current = setTimeout(() => setAccessOpen(false), 160);
  }, []);

  // Indicador deslizante: sigue al enlace de la sección activa.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const syncIndicator = () => {
      const active = nav.querySelector('[data-active="true"]');
      if (!active || !active.offsetWidth) {
        nav.style.setProperty("--nav-indicator-opacity", "0");
        return;
      }
      nav.style.setProperty("--nav-indicator-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--nav-indicator-w", `${active.offsetWidth}px`);
      nav.style.setProperty("--nav-indicator-opacity", "1");
    };

    syncIndicator();
    window.addEventListener("resize", syncIndicator);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(syncIndicator);
      observer.observe(nav);
    }

    return () => {
      window.removeEventListener("resize", syncIndicator);
      observer?.disconnect();
    };
  }, [activeId, menuOpen]);

  // Menú móvil: escape, clic fuera y lock de scroll en pantallas chicas.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const trigger = document.activeElement;

    if (isMobile()) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccessOpen(false);
        if (trigger instanceof HTMLElement && trigger.isConnected) {
          trigger.focus({ preventScroll: true });
        } else {
          menuToggleRef.current?.focus();
        }
      }
    };

    const handlePointerDown = (event) => {
      if (dockRef.current && !dockRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);

    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [menuOpen, dockRef]);

  const esScroll = variant === "scroll";
  const visibleDock = !esScroll || visible || menuOpen;

  return (
    <header
      ref={dockRef}
      className={`${styles.topbar}${esScroll ? "" : ` ${styles.topbarFixed}`}${cartAction ? ` ${styles.topbarWithCart}` : ""}${menuOpen ? ` ${styles.topbarMenuOpen}` : ""}${
        esScroll ? ` ${visibleDock ? styles.topbarVisible : styles.topbarHidden}` : ""
      }`}
      aria-hidden={esScroll && !visibleDock ? true : undefined}
    >
      <span className={styles.scrollProgress} aria-hidden="true">
        <i />
      </span>

      <div className={styles.topbarShell}>
        <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
          <Image
            src="/arconet.png"
            alt="Arconet"
            width={1200}
            height={200}
            sizes="(max-width: 1040px) 114px, 176px"
            loading="eager"
            fetchPriority="low"
          />
        </Link>

        <nav className={styles.navigation} aria-label="Navegación principal" ref={navRef}>
          <span className={styles.navIndicator} aria-hidden="true" />
          {navigation.map((item) => {
            const isActive = Boolean(item.id) && activeId === item.id;
            return (
              <a
                key={item.id ?? item.label}
                data-active={isActive ? "true" : "false"}
                className={`${isActive ? styles.navigationActive : ""}${item.mega ? ` ${styles.megaTrigger}` : ""}`}
                href={item.href}
                aria-current={isActive ? "location" : undefined}
              >
                {item.label}
              </a>
            );
          })}
          <button
            ref={menuToggleRef}
            type="button"
            className={`${styles.menuToggle}${menuOpen ? ` ${styles.menuToggleActive}` : ""}`}
            aria-expanded={menuOpen}
            aria-controls="nav-dock-mobile-menu"
            aria-haspopup="true"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className={styles.menuBar} />
            <span className={styles.menuBar} />
            <span className={styles.menuBar} />
          </button>
        </nav>

        <div className={styles.topbarActions}>
          {cartAction}
          <div
            className={styles.accessMenu}
            onMouseEnter={() => abrirAcceder()}
            onMouseLeave={() => programarCierreAcceder()}
            onFocus={() => setAccessOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAccessOpen(false);
            }}
          >
            <button
              type="button"
              className={styles.topAction}
              aria-haspopup="true"
              aria-expanded={accessOpen}
              aria-label="Acceder al sistema"
            >
              <span>Acceder</span>
              <span className={styles.topActionIcon}>
                <ArrowUpRight size={15} />
              </span>
            </button>
            <div className={styles.accessMenuPanel} role="menu" aria-label="Acceder">
              <a className={styles.accessMenuLogin} href="/login" role="menuitem">
                <LogIn size={16} aria-hidden="true" />
                <span>
                  <strong>Login</strong>
                  <small>Portal de clientes</small>
                </span>
              </a>
              <a className={styles.accessMenuAdmin} href="/admin" role="menuitem">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  <strong>Admin</strong>
                  <small>Panel administrativo</small>
                </span>
              </a>
            </div>
          </div>
        </div>

        {navigation.some((item) => item.mega) && (
          <div className={styles.desktopMenu} aria-label="Menú desplegable">
            <div className={styles.desktopMenuTop}>
              <Link className={styles.desktopMenuPrimary} href="/tienda">
                <span className={styles.desktopMenuPrimaryText}>
                  <span className={styles.desktopMenuPrimaryLabel}>Tienda</span>
                  <span className={styles.desktopMenuPrimaryHint}>Explora todos los productos</span>
                </span>
                <span className={styles.desktopMenuPrimaryIcon}>
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </Link>

              <div className={styles.desktopMenuAuth}>
                <a className={styles.desktopMenuLogin} href="/login">
                  <LogIn size={16} aria-hidden="true" />
                  Login
                </a>
                <a className={styles.desktopMenuAdmin} href="/admin">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Admin
                </a>
              </div>
            </div>

            <div className={styles.desktopMenuGroups}>
              {navigation.filter((item) => item.mega).map((item) =>
                item.megaGroups.map((group) => (
                  <section key={`${item.id}-${group.title}`} className={styles.desktopMenuGroup}>
                    <h4>{group.title}</h4>
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.label}>
                          <a href={link.href}>{link.label}</a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <div className={styles.desktopMenuLegal}>
              <a href="/terminos">Términos</a>
              <a href="/privacidad">Privacidad</a>
              <a href="/ayuda">Ayuda</a>
            </div>
          </div>
        )}

        {menuOpen && (
          <nav
            id="nav-dock-mobile-menu"
            ref={mobileMenuRef}
            className={styles.mobileMenu}
            aria-label="Menú de navegación móvil"
            tabIndex={-1}
          >
            <div className={styles.mobileMenuHead}>
              <span className={styles.mobileMenuEyebrow}>Navegación</span>
              <button
                type="button"
                className={styles.mobileMenuClose}
                onClick={() => {
                  setMenuOpen(false);
                  menuToggleRef.current?.focus();
                }}
                aria-label="Cerrar menú"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <Link
              className={styles.mobileMenuPrimary}
              href="/tienda"
              onClick={() => setMenuOpen(false)}
            >
              <span className={styles.mobileMenuPrimaryText}>
                <span className={styles.mobileMenuPrimaryLabel}>Tienda</span>
                <span className={styles.mobileMenuPrimaryHint}>Explora todos los productos</span>
              </span>
              <span className={styles.mobileMenuPrimaryIcon}>
                <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Link>

            <div className={styles.mobileMenuAuth}>
              <a
                className={styles.mobileMenuLogin}
                href="/login"
                onClick={() => setMenuOpen(false)}
              >
                <LogIn size={16} aria-hidden="true" />
                Login
              </a>
              <a
                className={styles.mobileMenuAdmin}
                href="/admin"
                onClick={() => setMenuOpen(false)}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Admin
              </a>
            </div>

            <div className={styles.mobileMenuLinks}>
              {navigation.filter((item) => item.href !== "/tienda").map((item) =>
                item.mega ? (
                  <div key={item.id ?? item.label} className={styles.mobileMenuGroup}>
                    <a
                      className={styles.mobileMenuGroupTitle}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                    {item.megaGroups.map((group) => (
                      <div key={group.title} className={styles.mobileMenuSubgroup}>
                        <strong>{group.title}</strong>
                        {group.links.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <a
                    key={item.id ?? item.label}
                    className={styles.mobileMenuLink}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              )}
            </div>

            <button
              type="button"
              className={styles.mobileMenuTheme}
              onClick={() => {
                cycleTheme();
              }}
              aria-label={`Tema: ${themeLabel}. Cambiar tema`}
            >
              <span>Tema: {themeLabel}</span>
              <ThemeIcon size={18} aria-hidden="true" />
            </button>

            <div className={styles.mobileMenuLegal}>
              <a href="/terminos" onClick={() => setMenuOpen(false)}>Términos</a>
              <a href="/privacidad" onClick={() => setMenuOpen(false)}>Privacidad</a>
              <a href="/ayuda" onClick={() => setMenuOpen(false)}>Ayuda</a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
