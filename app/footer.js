"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUp, Clock, Mail, MapPin, Phone } from "lucide-react";
import { FAMILIES } from "./tienda/catalogo-data";
import styles from "./footer.module.css";
import { useContact } from "./contact-provider";

// Los enlaces de empresa van en tres bloques: la navegación principal arriba,
// las páginas de ayuda después y lo legal al final. Antes eran una sola lista
// de diez que se leía como un bloque de texto.
const EMPRESA_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#empresa", label: "La empresa" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
];

const AYUDA_LINKS = [
  { href: "/ayuda", label: "Ayuda y preguntas frecuentes" },
  { href: "/garantias", label: "Garantías y devoluciones" },
];

const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos de uso" },
  { href: "/privacidad", label: "Aviso de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/aviso-legal", label: "Aviso legal" },
];

const SOCIAL = [
  {
    href: "https://www.instagram.com/arcolab_s.a/",
    label: "Instagram",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z",
  },
];

const HORARIO = "Lun–Vie 8:00–17:00 · Sáb 8:00–12:00";
const DIRECCION = "4 Calle 11 Avenida, Barrio Guamilito";

export function Sedes({ estado, sedes }) {
  return (
    <div className={styles.sedes} aria-live="polite" aria-busy={estado === "cargando"}>
      <span className={styles.sedesLabel}>Sedes</span>
      {estado === "cargando" && <span className={styles.sedesEstado}>Cargando sedes…</span>}
      {estado === "error" && <span className={styles.sedesEstado}>No se pudieron cargar las sedes.</span>}
      {estado === "listo" && sedes.length === 0 && <span className={styles.sedesEstado}>No hay sedes activas en este momento.</span>}
      {estado === "listo" && sedes.map((sede) => (
        <span key={sede.id} className={styles.sede}>{sede.nombre} · {sede.ciudad}</span>
      ))}
    </div>
  );
}

export default function Footer() {
  const [sedes, setSedes] = useState({ estado: "cargando", sedes: [] });
  useEffect(() => {
    let active = true;
    let sequence = 0;
    let controller;
    const refresh = async () => {
      const request = ++sequence;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/sedes-publicas", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("No disponible");
        const data = await response.json();
        if (!Array.isArray(data.sedes) || !data.sedes.every(s => typeof s.id === "string" && typeof s.nombre === "string" && typeof s.ciudad === "string")) throw new Error("Datos inválidos");
        if (active && request === sequence) setSedes({ estado: "listo", sedes: data.sedes });
      } catch {
        if (active && request === sequence) setSedes({ estado: "error", sedes: [] });
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(onVisible, 60000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const { email: CONTACT_EMAIL, phone: CONTACT_PHONE, phoneHref: CONTACT_PHONE_HREF } = useContact();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      {/* Banda de contacto: lo que la gente más busca en un pie de página, en
          primera línea y a tamaño de titular. */}
      <div className={styles.contacto}>
        <div className={styles.contactoTexto}>
          <p className={styles.eyebrow}>Hablemos de tu proyecto</p>
          <h2 className={styles.contactoTitulo}>
            ¿Listo para conectar? <em>Escríbenos.</em>
          </h2>
        </div>
        <div className={styles.contactoAcciones}>
          <a className={styles.ctaPrincipal} href={`mailto:${CONTACT_EMAIL}`}>
            <Mail aria-hidden="true" />
            {CONTACT_EMAIL}
          </a>
          <a className={styles.ctaSecundario} href={CONTACT_PHONE_HREF}>
            <Phone aria-hidden="true" />
            {CONTACT_PHONE}
          </a>
        </div>
      </div>

      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
            <Image
              src="/arconet.png"
              alt="Arconet"
              width={1200}
              height={200}
              sizes="(max-width: 760px) 150px, 190px"
              fetchPriority="low"
            />
          </Link>
          <p className={styles.tagline}>Conectividad que acerca.</p>
          <p className={styles.blurb}>
            Equipos y soluciones de telecomunicaciones para fibra óptica, CATV, satélite e
            infraestructura de red, con asesoría de principio a fin.
          </p>

          <div className={styles.social} aria-label="Redes sociales">
            {SOCIAL.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d={item.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <nav className={styles.col} aria-label="Soluciones">
          <h3 className={styles.colTitle}>
            Soluciones <span className={styles.colCount}>{String(FAMILIES.length).padStart(2, "0")}</span>
          </h3>
          <ul className={styles.colList}>
            {FAMILIES.map((family) => (
              <li key={family.slug}>
                <Link className={styles.colLink} href={`/tienda/${family.slug}`}>
                  {family.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <nav aria-label="Empresa">
            <h3 className={styles.colTitle}>Empresa</h3>
            <ul className={styles.colList}>
              {EMPRESA_LINKS.map((link) => (
                <li key={link.href}>
                  <Link className={styles.colLink} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.subBloque} aria-label="Ayuda">
            <h3 className={styles.colTitle}>Ayuda</h3>
            <ul className={styles.colList}>
              {AYUDA_LINKS.map((link) => (
                <li key={link.href}>
                  <Link className={styles.colLink} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Contacto</h3>
          <ul className={styles.contactList}>
            <li className={styles.contactItem}>
              <Mail aria-hidden="true" />
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li className={styles.contactItem}>
              <Phone aria-hidden="true" />
              <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE}</a>
            </li>
            <li className={styles.contactItem}>
              <MapPin aria-hidden="true" />
              <span>
                {DIRECCION}
                <br />
                San Pedro Sula, Cortés
              </span>
            </li>
            <li className={styles.contactItem}>
              <Clock aria-hidden="true" />
              <span>{HORARIO}</span>
            </li>
          </ul>

          <Sedes estado={sedes.estado} sedes={sedes.sedes} />
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.copyright}>© 2026 Arconet, S.A. · Honduras</span>
        <div className={styles.legal}>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <button type="button" className={styles.toTop} onClick={scrollToTop}>
          <ArrowUp aria-hidden="true" /> Volver arriba
        </button>
      </div>
    </footer>
  );
}
