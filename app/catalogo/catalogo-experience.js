"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cable,
  Check,
  Handshake,
  MapPin,
  Network,
  PackageCheck,
  Radio,
  Satellite,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import styles from "./catalogo-experience.module.css";
import { CATEGORIES, FAMILIES } from "./catalogo-data";

const NAVIGATION = [
  { href: "#familias", label: "Soluciones", id: "familias" },
  { href: "#catalogo-items", label: "Catálogo", id: "catalogo-items" },
  { href: "#acompanamiento", label: "Acompañamiento", id: "acompanamiento" },
  { href: "/#contacto", label: "Contacto", id: "" },
];

const TRUST = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: Handshake, title: "Asesoría de una persona", text: "Alguien revisa tu proyecto contigo." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde estés." },
];


const STEPS = [
  {
    number: "01",
    title: "Nos cuentas tu proyecto",
    text: "Una llamada o un mensaje basta. Nos dices qué necesitas conectar y te hacemos las preguntas correctas.",
  },
  {
    number: "02",
    title: "Te recomendamos y cotizamos",
    text: "Seleccionamos el equipo que sí sirve para tu caso y te enviamos una cotización clara, sin letra chica.",
  },
  {
    number: "03",
    title: "Entregamos y acompañamos",
    text: "Coordinamos la entrega y seguimos disponibles durante la instalación y después de ella.",
  },
];

const DETAILS = [
  { icon: MapPin, title: "San Pedro Sula, Cortés", text: "Atendemos proyectos en todo Honduras." },
  { icon: Handshake, title: "Hablas con el equipo técnico", text: "No hay bots de por medio." },
  { icon: ShieldCheck, title: "Soporte antes y después", text: "Te acompañamos también en la instalación." },
];

export default function CatalogoExperience() {
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const update = ({ scroll = window.scrollY } = {}) => {
      const shouldShow = scroll > window.innerHeight * 0.7;
      setScrolledPastHero((current) => current === shouldShow ? current : shouldShow);
    };

    const locomotive = new LocomotiveScroll({
      lenisOptions: {
        anchors: true,
        lerp: 0.085,
        respectReducedMotion: true,
        smoothTouch: false,
        smoothWheel: true,
      },
      scrollCallback: update,
    });

    update({ scroll: window.scrollY });
    return () => locomotive.destroy();
  }, []);

  useEffect(() => {
    const ids = NAVIGATION.map((item) => item.id).filter(Boolean);
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection((current) => (current === entry.target.id ? current : entry.target.id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return undefined;

    if (typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const visibleFamilies = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("es");
    return FAMILIES.filter((family) => {
      const matchesCategory = activeCategory === "Todas" || family.category === activeCategory;
      const haystack = `${family.title} ${family.summary} ${family.category} ${family.items.join(" ")}`.toLocaleLowerCase("es");
      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [activeCategory, searchTerm]);

  const resetFilters = () => {
    setActiveCategory("Todas");
    setSearchTerm("");
  };

  const hasFilters = activeCategory !== "Todas" || searchTerm.trim().length > 0;

  return (
    <main className={styles.catalog}>
      <header className={`${styles.topbar} ${scrolledPastHero ? styles.topbarVisible : styles.topbarHidden}`} aria-hidden={!scrolledPastHero}>
        <a className={styles.topbarBrand} href="/" aria-label="Arconet, inicio" tabIndex={scrolledPastHero ? 0 : -1}>
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
        </a>
        <nav className={styles.topbarNav} aria-label="Navegación del catálogo">
          {NAVIGATION.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={item.id && activeSection === item.id ? styles.topbarNavActive : ""}
              aria-current={item.id && activeSection === item.id ? "location" : undefined}
              tabIndex={scrolledPastHero ? 0 : -1}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a className={styles.topbarAction} href="/#contacto" tabIndex={scrolledPastHero ? 0 : -1}>
          Hablemos <ArrowUpRight size={15} />
        </a>
      </header>

      <div className={styles.heroFrame}>
        <section className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image
              src="/catalogo/infraestructura.jpg"
              alt="Equipos y cableado de telecomunicaciones de Arconet"
              fill
              loading="eager"
              sizes="100vw"
              className={styles.heroImage}
              data-scroll
              data-scroll-speed="0.04"
            />
            <div className={styles.heroOverlay} />
          </div>

          <header className={styles.heroHeader}>
            <a className={styles.heroBrand} href="/" aria-label="Arconet, inicio">
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
            </a>
            <nav className={styles.navigation} aria-label="Navegación principal">
              {NAVIGATION.map((item) => (
                <a className={item.id && activeSection === item.id ? styles.navigationActive : ""} href={item.href} key={item.label}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.heroActionTab}>
              <a className={styles.contactButton} href="/#contacto">
                <span className={styles.contactLabel}>Hablemos</span>
                <span className={styles.contactIcon}><ArrowUpRight size={14} /></span>
              </a>
            </div>
          </header>

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}><i /> Catálogo técnico · Honduras</p>
            <h1>Todo para tu red,<br />y <em>quién te acompaña.</em></h1>
            <p className={styles.heroDescription}>
              Fibra óptica, CATV, satélite e infraestructura. Explora el catálogo y cotiza con una persona de nuestro equipo, aquí en San Pedro Sula.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#catalogo-items">
                Explorar catálogo <span><ArrowUpRight size={16} /></span>
              </a>
              <a className={styles.ghostButton} href="/#contacto">
                Pedir asesoría <ArrowRight size={15} />
              </a>
            </div>
          </div>

          <div className={styles.heroFooter}>
            <span>ARCONET · SAN PEDRO SULA, HONDURAS</span>
            <a href="#familias">Descubrir líneas <ArrowDown size={14} /></a>
          </div>
        </section>
      </div>

      <section className={styles.trustBar} aria-label="Cómo trabajamos">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <div className={styles.trustItem} key={title}>
            <Icon size={22} strokeWidth={1.5} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      <section id="familias" className={styles.introSection}>
        <div className={styles.introCopy} data-reveal>
          <p className={styles.sectionEyebrow}><i /> Lo que necesitas, bien conectado</p>
          <h2>Soluciones para redes<br /><em>que hacen más.</em></h2>
        </div>
        <div className={styles.introAside} data-reveal>
          <p className={styles.introText}>
            Distribuimos, importamos y damos soporte para equipos de telecomunicaciones. Si no sabes exactamente qué pieza necesitas, lo averiguamos contigo: esa es parte del trabajo.
          </p>
          <p className={styles.introSignature}>— Equipo Arconet · San Pedro Sula</p>
        </div>
      </section>

      <section id="catalogo-items" className={styles.catalogSection}>
        <div className={styles.catalogHeading} data-reveal>
          <div>
            <p className={styles.sectionEyebrow}><i /> Encuentra tu solución</p>
            <h2>Líneas de producto</h2>
          </div>
          <span className={styles.resultCount}>
            {String(visibleFamilies.length).padStart(2, "0")} de {String(FAMILIES.length).padStart(2, "0")} líneas
          </span>
        </div>

        <div className={styles.catalogControls}>
          <div className={styles.categoryFilters} role="group" aria-label="Filtrar por categoría">
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                className={activeCategory === category ? styles.categoryActive : ""}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="¿Qué necesitas? Ej. splitter"
              aria-label="Buscar en el catálogo"
            />
            {searchTerm && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className={styles.familyGrid}>
          {visibleFamilies.length ? (
            visibleFamilies.map((family) => {
              const Icon = family.icon;
              return (
                <article className={styles.familyCard} key={family.id}>
                  <div className={`${styles.familyVisual} ${styles[family.visual]}`}>
                    {family.image ? (
                      <Image
                        src={family.image}
                        alt={family.imageAlt}
                        fill
                        sizes="(max-width: 700px) 92vw, (max-width: 1080px) 46vw, 30vw"
                        className={styles.familyImage}
                      />
                    ) : (
                      <div className={styles.familyGraphic} aria-hidden="true">
                        <div className={styles.graphicOrbit}><i /><i /><i /></div>
                        <Icon size={58} strokeWidth={1.1} />
                        <span>AR / {family.index}</span>
                      </div>
                    )}
                    <span className={styles.familyIndex}>{family.index}</span>
                  </div>

                  <div className={styles.familyCopy}>
                    <p className={styles.familyCategory}>{family.category}</p>
                    <h3>{family.title}</h3>
                    <p className={styles.familySummary}>{family.summary}</p>
                    <ul className={styles.familyItems}>
                      {family.items.map((item) => (
                        <li key={item}><Check size={13} aria-hidden="true" />{item}</li>
                      ))}
                    </ul>
                    <Link className={styles.familyLink} href={`/catalogo/${family.slug}`}>
                      Ver detalle y cotizar <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <Search size={24} strokeWidth={1.4} aria-hidden="true" />
              <p>No encontramos esa línea todavía, pero podemos conseguirla para ti.</p>
              <div>
                <button type="button" onClick={resetFilters}>Ver todo el catálogo</button>
                <a href="/#contacto">Escribir al equipo <ArrowRight size={15} /></a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="acompanamiento" className={styles.supportSection}>
        <div className={styles.supportIntro} data-reveal>
          <p className={styles.sectionEyebrow}><i /> Acompañamiento</p>
          <h2>El equipo importa.<br /><em>Quién te respalda, también.</em></h2>
          <p className={styles.supportText}>
            Comprar el equipo es la parte fácil. Lo difícil es que funcione bien el día que se instala, y para eso estamos: respondemos, recomendamos y seguimos ahí.
          </p>
          <a className={styles.supportLink} href="/#contacto">Conversemos de tu proyecto <ArrowRight size={16} /></a>
        </div>

        <div className={styles.supportMedia} data-reveal>
          <Image
            src="/empresa.webp"
            alt="Instalaciones de Arconet en San Pedro Sula"
            fill
            sizes="(max-width: 900px) 92vw, 42vw"
            className={styles.supportImage}
          />
          <span className={styles.supportCaption}>San Pedro Sula, Honduras</span>
        </div>

        <ol className={styles.stepsList} data-reveal>
          {STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.detailBand} aria-label="Detalles de la atención">
        {DETAILS.map(({ icon: Icon, title, text }) => (
          <div className={styles.detailItem} key={title}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
        <div className={styles.detailMark} aria-hidden="true"><Network size={26} strokeWidth={1.2} /><span>01 — 05</span></div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactGrid} aria-hidden="true" />
        <div className={styles.contactContent} data-reveal>
          <p className={styles.contactEyebrow}>Tu proyecto empieza con una conversación</p>
          <h2>Hagamos que<br /><em>todo conecte.</em></h2>
          <p>
            Dinos qué necesitas conectar. Te respondemos con una recomendación concreta y una cotización clara, sin compromiso.
          </p>
          <a className={styles.contactAction} href="/#contacto">
            Escribir al equipo <ArrowUpRight size={17} />
          </a>
        </div>
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <footer className={styles.footer}>
        <a className={styles.footerBrand} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
        </a>
        <p>Conectividad que acerca.</p>
        <nav className={styles.footerNav} aria-label="Navegación del pie de página">
          {NAVIGATION.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <span className={styles.footerCopyright}>© 2026 Arconet, S.A. · Honduras</span>
      </footer>
    </main>
  );
}
