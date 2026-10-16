"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, FileText } from "lucide-react";
import styles from "./terminos-experience.module.css";

const SECTIONS = [
  {
    id: "alcance",
    number: "01",
    label: "Alcance del sitio",
    title: "Un punto de partida, no un contrato.",
    paragraphs: [
      "Este sitio presenta información general sobre Arconet, sus líneas de producto y formas de solicitar orientación. El contenido de esta página es un borrador de trabajo y debe revisarse antes de publicarse como condición vigente.",
      "La navegación por el sitio no crea por sí sola una relación comercial ni sustituye una propuesta, una orden de compra o un acuerdo firmado entre las partes.",
    ],
  },
  {
    id: "cotizaciones",
    number: "02",
    label: "Consultas y cotizaciones",
    title: "Cada proyecto merece una propuesta clara.",
    paragraphs: [
      "Las consultas que se preparan desde el sitio sirven para iniciar una conversación. No constituyen una orden de compra, una reserva de inventario ni una confirmación de disponibilidad.",
      "Los productos, cantidades, precios, impuestos, condiciones de pago y tiempos de entrega deberán quedar confirmados por escrito en la cotización correspondiente antes de aceptar un pedido.",
    ],
  },
  {
    id: "informacion",
    number: "03",
    label: "Información de productos",
    title: "La ficha correcta empieza con el modelo correcto.",
    paragraphs: [
      "Las descripciones del catálogo son orientativas. Las especificaciones finales, compatibilidades, accesorios incluidos y condiciones de garantía dependen del fabricante y del modelo cotizado.",
      "Antes de comprar o instalar un equipo, confirma que sus características coinciden con los requisitos de tu red y con la documentación técnica del producto.",
    ],
  },
  {
    id: "entregas",
    number: "04",
    label: "Entregas y soporte",
    title: "Los detalles se acuerdan para cada instalación.",
    paragraphs: [
      "La cobertura, el costo y el plazo estimado de entrega se confirman en cada propuesta, según el destino, la disponibilidad y el alcance del proyecto.",
      "La asesoría técnica incluida y el soporte posterior deben detallarse en la cotización o en el acuerdo aplicable. No se deben interpretar como servicios garantizados por la sola visita a esta página.",
    ],
  },
  {
    id: "privacidad",
    number: "05",
    label: "Privacidad y comunicaciones",
    title: "Tú decides cuándo compartir tu solicitud.",
    paragraphs: [
      "El formulario de contacto de esta versión prepara un borrador en la aplicación de correo del visitante; este sitio no envía ni almacena la solicitud en un servidor.",
      "Si decides enviarlo, la gestión posterior de los datos deberá describirse en una política de privacidad aprobada por Arconet. Esta maqueta no sustituye esa política.",
    ],
  },
  {
    id: "uso",
    number: "06",
    label: "Uso del contenido",
    title: "Información para orientar, no para sustituir asesoría.",
    paragraphs: [
      "Los textos, imágenes y materiales del sitio se presentan con fines informativos. No deben reproducirse o distribuirse como fichas técnicas oficiales sin autorización y verificación del fabricante.",
      "El visitante es responsable de evaluar la información aplicable a su instalación y de solicitar confirmación técnica cuando una decisión dependa de requisitos específicos.",
    ],
  },
  {
    id: "vigencia",
    number: "07",
    label: "Cambios y revisión",
    title: "La versión vigente debe aprobarse antes de publicarse.",
    paragraphs: [
      "Arconet puede actualizar el contenido del sitio para reflejar cambios en productos, servicios y procesos. La fecha y el alcance de cada actualización deberán indicarse en la versión final.",
      "Este texto no contiene una fecha de entrada en vigor: permanece como borrador hasta que Arconet revise y apruebe las condiciones comerciales y legales aplicables.",
    ],
  },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function TerminosExperience() {
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  useEffect(() => {
    let lenis;
    let cancelled = false;
    const page = pageRef.current;
    const hero = heroRef.current;

    const updateProgress = ({ scroll = window.scrollY, limit, progress } = {}) => {
      const maxScroll = Math.max(limit ?? document.documentElement.scrollHeight - window.innerHeight, 1);
      const ratio = typeof progress === "number" ? progress : clamp(scroll / maxScroll);
      page?.style.setProperty("--read-progress", ratio.toFixed(4));
      if (hero) {
        const heroRange = Math.max(hero.offsetHeight * 0.85, 1);
        hero.style.setProperty("--hero-progress", clamp(scroll / heroRange).toFixed(4));
      }
    };

    const initLenis = async () => {
      try {
        const { default: Lenis } = await import("lenis");
        if (cancelled) return;

        lenis = new Lenis({
          anchors: true,
          autoRaf: true,
          lerp: 0.085,
          respectReducedMotion: true,
          smoothWheel: true,
          syncTouch: false,
        });
        lenis.on("scroll", updateProgress);
        updateProgress({ scroll: lenis.scroll, limit: lenis.limit, progress: lenis.progress });
      } catch {
        const updateNativeProgress = () => updateProgress({ scroll: window.scrollY });
        window.addEventListener("scroll", updateNativeProgress, { passive: true });
        updateNativeProgress();
        lenis = { destroy: () => window.removeEventListener("scroll", updateNativeProgress) };
      }
    };

    initLenis();
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length || typeof IntersectionObserver === "undefined") return undefined;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    targets.forEach((target) => revealObserver.observe(target));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );
    SECTIONS.forEach((section) => {
      const target = document.getElementById(section.id);
      if (target) sectionObserver.observe(target);
    });

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.termsPage}>
      <div className={styles.readingProgress} aria-hidden="true" />
      <div className={styles.heroFrame}>
        <section id="inicio" ref={heroRef} className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image
              src="/catalogo/infraestructura.jpg"
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
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
            </Link>
            <nav className={styles.navigation} aria-label="Navegación principal">
              <Link href="/">Inicio</Link>
              <Link href="/catalogo">Catálogo</Link>
              <Link className={styles.navigationActive} href="#terminos">Términos</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Documento en revisión · Arconet Honduras</p>
            <h1>Una relación clara<br />empieza por <em>hablar claro.</em></h1>
            <p>Este borrador explica cómo se presenta la información y cómo iniciar una solicitud a través del sitio de Arconet.</p>
            <Link className={styles.heroAction} href="#terminos">Leer el documento <span><ArrowDown size={16} /></span></Link>
          </div>

          <div className={styles.heroFooter}>
            <span>BORRADOR PARA REVISIÓN LEGAL Y COMERCIAL</span>
            <span>07 SECCIONES</span>
          </div>
        </section>
      </div>

      <section className={styles.draftNotice}>
        <div className={styles.noticeIcon}><FileText size={19} /></div>
        <p><strong>Versión de prueba.</strong> Este contenido no constituye términos vigentes ni asesoría legal. Requiere revisión y aprobación de Arconet antes de publicarse como política oficial.</p>
      </section>

      <div id="terminos" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Secciones del documento">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={activeSection === section.id ? styles.contentsActive : ""}
                aria-current={activeSection === section.id ? "location" : undefined}
              >
                <span>{section.number}</span>{section.label}
              </a>
            ))}
          </nav>
          <p className={styles.asideNote}>Desplazamiento suave con anclas nativas y reducción de movimiento respetada.</p>
        </aside>

        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}>
            <span>ARCONET · TÉRMINOS DE USO</span>
            <span>BORRADOR / 2026</span>
          </div>
          {SECTIONS.map((section) => (
            <section id={section.id} className={styles.termSection} key={section.id} data-reveal>
              <div className={styles.termNumber}>{section.number}</div>
              <div className={styles.termContent}>
                <p className={styles.termLabel}>{section.label}</p>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p className={styles.termParagraph} key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
          <div className={styles.documentEnd}>
            <span>FIN DEL BORRADOR</span>
            <Link href="/contacto">Consultar con Arconet <ArrowRight size={15} /></Link>
          </div>
        </article>
      </div>

      <footer className={styles.footer}>
        <Link className={styles.footerLogo} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
        </Link>
        <p>Borrador pendiente de aprobación.</p>
        <Link href="#inicio">Volver arriba <ArrowUpRight size={15} /></Link>
      </footer>
    </main>
  );
}
