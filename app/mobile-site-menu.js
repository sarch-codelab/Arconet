"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "./mobile-site-menu.module.css";

const LINKS = [
  ["Inicio", "/"],
  ["Soluciones", "/#soluciones"],
  ["Catálogo", "/catalogo"],
  ["La empresa", "/#empresa"],
  ["Contacto", "/contacto"],
  ["Ayuda", "/ayuda"],
];

export default function MobileSiteMenu({ floating = false }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const toggleRef = useRef(null);

  // El botón no siempre queda pegado al borde derecho (topbar del producto,
  // pestañas de acción con el botón "Hablemos" al lado), así que el panel se
  // ancla al viewport con coordenadas fijas medidas desde el botón y se
  // recorta dentro de la pantalla para que nunca salga por la izquierda.
  const syncPanelPosition = useCallback(() => {
    const rect = toggleRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(340, viewport - 28);
    const minRight = 14;
    const maxRight = Math.max(minRight, viewport - width - minRight);
    const right = Math.min(Math.max(viewport - rect.right, minRight), maxRight);
    const top = Math.round(rect.bottom + 10);
    setPanelStyle({
      position: "fixed",
      top: `${top}px`,
      right: `${right}px`,
      width: `${width}px`,
      maxHeight: `calc(100vh - ${top + 14}px)`,
    });
  }, []);

  const toggleMenu = () => {
    if (!open) syncPanelPosition();
    setOpen((value) => !value);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    const handleViewportChange = () => syncPanelPosition();
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, syncPanelPosition]);

  return (
    <div className={`${styles.root}${floating ? ` ${styles.floating}` : ""}`}>
      <button ref={toggleRef} className={styles.toggle} type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} onClick={toggleMenu}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && createPortal(<>
        <button className={styles.backdrop} type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
        <nav className={styles.panel} style={panelStyle || undefined} aria-label="Navegación principal">
          <span className={styles.label}>ARCONET · NAVEGACIÓN</span>
          {LINKS.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></Link>)}
          <div className={styles.legal}><Link href="/terminos" onClick={() => setOpen(false)}>Términos</Link><Link href="/privacidad" onClick={() => setOpen(false)}>Privacidad</Link></div>
        </nav>
      </>, document.body)}
    </div>
  );
}
