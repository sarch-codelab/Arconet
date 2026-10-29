"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { FAMILIES } from "./catalogo/catalogo-data";
import styles from "./footer.module.css";
import { useContact } from "./contact-provider";

const COMPANY_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#empresa", label: "La empresa" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/contacto", label: "Contacto" },
  { href: "/ayuda", label: "Ayuda y preguntas frecuentes" },
  { href: "/terminos", label: "Términos de uso" },
  { href: "/privacidad", label: "Aviso de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/garantias", label: "Garantías y devoluciones" },
];

const SOCIAL = [
  {
    href: "https://www.linkedin.com/company/arconet",
    label: "LinkedIn",
    path: "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45C23.2 24 24 23.22 24 22.27V1.73C24 .77 23.2 0 22.22 0z",
  },
  {
    href: "https://www.instagram.com/arconet",
    label: "Instagram",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z",
  },
  {
    href: "https://www.facebook.com/arconet",
    label: "Facebook",
    path: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z",
  },
];

export default function Footer() {
  const { email: CONTACT_EMAIL, phone: CONTACT_PHONE, phoneHref: CONTACT_PHONE_HREF } = useContact();
  const scrollToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
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
          <h2 className={styles.colTitle}>Soluciones</h2>
          <ul className={styles.colList}>
            {FAMILIES.map((family) => (
              <li key={family.slug}>
                <Link className={styles.colLink} href={`/catalogo/${family.slug}`}>
                  {family.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.col} aria-label="Empresa">
          <h2 className={styles.colTitle}>Empresa</h2>
          <ul className={styles.colList}>
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link className={styles.colLink} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Contacto</h2>
          <ul className={styles.colList}>
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
              <span>San Pedro Sula · Honduras</span>
            </li>
          </ul>
          <button type="button" className={styles.toTop} onClick={scrollToTop}>
            <ArrowUp aria-hidden="true" /> Volver arriba
          </button>
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.copyright}>© 2026 Arconet, S.A. · Honduras</span>
        <div className={styles.legal}>
          <Link href="/terminos">Términos de uso</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/garantias">Garantías</Link>
          <Link href="/contacto">Contacto</Link>
        </div>
      </div>
    </footer>
  );
}
