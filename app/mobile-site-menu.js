"use client";

import { useEffect, useState } from "react";
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
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className={`${styles.root}${floating ? ` ${styles.floating}` : ""}`}>
      <button className={styles.toggle} type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <>
        <button className={styles.backdrop} type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
        <nav className={styles.panel} aria-label="Navegación principal">
          <span className={styles.label}>ARCONET · NAVEGACIÓN</span>
          {LINKS.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></Link>)}
          <div className={styles.legal}><Link href="/terminos" onClick={() => setOpen(false)}>Términos</Link><Link href="/privacidad" onClick={() => setOpen(false)}>Privacidad</Link></div>
        </nav>
      </>}
    </div>
  );
}
