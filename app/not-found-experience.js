"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, Home, LifeBuoy } from "lucide-react";
import styles from "./not-found-experience.module.css";
import Footer from "./footer";
import MobileSiteMenu from "./mobile-site-menu";

const NAVIGATION = [
  { href: "/", label: "Inicio" },
  { href: "/#soluciones", label: "Soluciones" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
];

const SUGGESTIONS = [
  { href: "/", icon: Home, label: "Inicio", text: "Vuelve a la portada y conoce Arconet." },
  { href: "/tienda", icon: Compass, label: "Tienda", text: "Explora equipos, familias y soluciones." },
  { href: "/contacto", icon: LifeBuoy, label: "Contacto", text: "Cuéntanos qué necesitas y te orientamos." },
];

export default function NotFoundExperience() {
  return (
    <main className={styles.notFoundPage}>
      <div className={styles.heroFrame}>
        <section className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image
              src="/neto-error.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
          </div>

          <header className={styles.heroHeader}>
            <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
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
            <nav className={styles.navigation} aria-label="Navegación principal">
              {NAVIGATION.map((item) => (
                <a href={item.href} key={item.label}>{item.label}</a>
              ))}
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/">Ir al inicio <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Error 404 · Ruta no encontrada</p>
            <p className={styles.code} aria-hidden="true">404</p>
            <h1>Esta página<br /><em>se desconectó.</em></h1>
            <p>No pudimos encontrar lo que buscabas. Puede que el enlace haya cambiado o que la página ya no exista.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/">Volver al inicio <span><ArrowRight size={16} /></span></Link>
              <Link className={styles.secondaryAction} href="/tienda">Explorar catálogo</Link>
            </div>
          </div>

          <div className={styles.heroFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <span>ARCONET · SAN PEDRO SULA, HONDURAS</span>
          </div>
        </section>
      </div>

      <section className={styles.suggestions}>
        <div className={styles.suggestionsHead}>
          <p className={styles.sectionLabel}>Quizá buscabas</p>
          <h2>Sigamos <em>conectados.</em></h2>
        </div>
        <div className={styles.suggestionGrid}>
          {SUGGESTIONS.map(({ href, icon: Icon, label, text }) => (
            <a className={styles.suggestionCard} href={href} key={label}>
              <span className={styles.suggestionIcon}><Icon size={20} strokeWidth={1.5} /></span>
              <strong>{label}</strong>
              <small>{text}</small>
              <ArrowUpRight className={styles.suggestionArrow} size={18} />
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
