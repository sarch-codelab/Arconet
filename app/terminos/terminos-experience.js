"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "./terminos-experience.module.css";
import Footer from "../footer";
import { useContact } from "../contact-provider";
import MobileSiteMenu from "../mobile-site-menu";

const SECTIONS = [
  {
    id: "alcance",
    number: "01",
    label: "Alcance y aceptación",
    title: "Reglas claras para usar el sitio.",
    paragraphs: [
      "Estos términos regulan el acceso y uso de arconethn.com, incluido el catálogo y el portal de clientes. Al navegar o crear una cuenta, aceptas usarlos de forma lícita y conforme a estas condiciones.",
      "El sitio presenta información sobre Arconet y permite iniciar consultas. La navegación, por sí sola, no confirma una compra, reserva inventario ni crea un acuerdo de instalación.",
    ],
  },
  {
    id: "cuenta",
    number: "02",
    label: "Cuenta de cliente",
    title: "Mantén tu información actualizada y segura.",
    paragraphs: [
      "Para usar el portal debes proporcionar información correcta y mantener la confidencialidad de tus credenciales. Eres responsable de la actividad realizada desde tu sesión; avisa a Arconet si sospechas que alguien más accedió a tu cuenta.",
      "No uses el portal para suplantar a otra persona, intentar acceder a cuentas ajenas, interferir con el servicio ni enviar contenido ilegal o malicioso. Arconet puede restringir temporalmente una cuenta cuando sea necesario para proteger el servicio o a sus usuarios.",
      ({ email }) => `Puedes solicitar ayuda para actualizar o cerrar tu cuenta escribiendo a ${email} desde el correo asociado a ella.`,
    ],
  },
  {
    id: "cotizaciones",
    number: "03",
    label: "Solicitudes y cotizaciones",
    title: "La propuesta escrita confirma los detalles.",
    paragraphs: [
      "Una solicitud enviada desde el portal inicia una revisión comercial; no es una orden de compra ni confirma precio, disponibilidad o plazo de entrega.",
      "La cotización aceptada o el acuerdo escrito correspondiente especificará los productos y cantidades, precio e impuestos aplicables, condiciones de pago, lugar y plazo de entrega, vigencia de la propuesta, garantía y cualquier servicio de instalación o soporte.",
      "Si existe diferencia entre la información general del sitio y una cotización confirmada, prevalecen los detalles acordados para esa operación, sin limitar los derechos que correspondan conforme a la normativa aplicable.",
    ],
  },
  {
    id: "productos",
    number: "04",
    label: "Productos e información",
    title: "Verifica el modelo y los requisitos técnicos.",
    paragraphs: [
      "Las descripciones, imágenes y especificaciones del catálogo son informativas y pueden actualizarse. La disponibilidad y las características finales se confirman para el modelo indicado en la cotización.",
      "Antes de comprar o instalar un equipo, confirma compatibilidad y requisitos con la ficha técnica del fabricante y con el equipo de Arconet cuando la decisión dependa de condiciones específicas de tu red.",
    ],
  },
  {
    id: "entregas",
    number: "05",
    label: "Entrega, garantías y soporte",
    title: "Cada proyecto establece su propio alcance.",
    paragraphs: [
      "El destino, costo y plazo estimado de entrega se detallarán en la cotización confirmada, según ubicación, disponibilidad y alcance del proyecto.",
      "La cobertura de garantía, devoluciones, instalación y soporte se especificará para cada producto o servicio en la cotización, factura, documentación del fabricante o acuerdo aplicable. Nada en estos términos limita derechos irrenunciables que correspondan al cliente conforme a la normativa aplicable.",
    ],
  },
  {
    id: "privacidad",
    number: "06",
    label: "Privacidad y comunicaciones",
    title: "Consulta cómo se usan tus datos.",
    paragraphs: [
      "El formulario público de contacto prepara un mensaje en la aplicación de correo del visitante; el sitio no envía ni almacena esa consulta en su servidor. Si decides enviarlo, el mensaje se procesa con tu proveedor de correo.",
      "El portal almacena datos de cuenta y solicitudes de cotización para operar el servicio. Consulta el Aviso de privacidad de Arconet para conocer qué datos se usan, cómo solicitar acceso, corrección o eliminación y qué información guarda tu navegador.",
    ],
  },
  {
    id: "contenido",
    number: "07",
    label: "Contenido y propiedad intelectual",
    title: "Materiales publicados para informar.",
    paragraphs: [
      "Los textos, marcas, fotografías, gráficos y otros materiales del sitio pertenecen a Arconet o se utilizan con autorización. No los reproduzcas, publiques ni presentes como propios sin permiso escrito, salvo los usos permitidos por ley.",
      "Los enlaces a sitios de terceros se ofrecen para referencia. Arconet no controla sus contenidos, disponibilidad ni prácticas de privacidad.",
    ],
  },
  {
    id: "cambios",
    number: "08",
    label: "Cambios y contacto",
    title: "La versión vigente se publica aquí.",
    paragraphs: [
      "Podemos actualizar estas condiciones para reflejar cambios en el sitio o en la forma de atender solicitudes. Indicaremos la fecha de actualización en esta página. Los cambios no modifican acuerdos comerciales ya confirmados, salvo acuerdo escrito de las partes.",
      ({ email, phone }) => `Para consultas sobre estos términos, escribe a ${email} o llámanos al ${phone}. La última actualización de esta página es del 23 de octubre de 2026.`,
    ],
  },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function TerminosExperience() {
  const contact = useContact();
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
              src="/escudo-digital.webp"
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
              <Link href="/tienda">Catálogo</Link>
              <Link className={styles.navigationActive} href="#terminos" aria-current="page">Términos</Link>
              <Link href="/privacidad">Privacidad</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Términos del sitio · Arconet Honduras</p>
            <h1>Una relación clara<br />empieza por <em>hablar claro.</em></h1>
            <p>Condiciones para usar el sitio, el catálogo y el portal de clientes de Arconet.</p>
            <Link className={styles.heroAction} href="#terminos">Leer el documento <span><ArrowDown size={16} /></span></Link>
          </div>

          <div className={styles.heroFooter}>
            <span>CONDICIONES DEL SITIO Y PORTAL DE CLIENTES</span>
            <span>08 SECCIONES · ACTUALIZADO 23 OCT 2026</span>
          </div>
        </section>
      </div>

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
            <span>ÚLTIMA ACTUALIZACIÓN · 23.10.2026</span>
          </div>
          {SECTIONS.map((section) => (
            <section id={section.id} className={styles.termSection} key={section.id} data-reveal>
              <div className={styles.termNumber}>{section.number}</div>
              <div className={styles.termContent}>
                <p className={styles.termLabel}>{section.label}</p>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p className={styles.termParagraph} key={`${section.id}-${index}`}>
                    {typeof paragraph === "function" ? paragraph(contact) : paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
          <div className={styles.documentEnd}>
            <span>ARCONET, S.A. · SAN PEDRO SULA, HONDURAS</span>
            <div>
              <Link href="/privacidad">Aviso de privacidad</Link>
              <Link href="/contacto">Consultar con Arconet <ArrowRight size={15} /></Link>
            </div>
          </div>
        </article>
      </div>

      <Footer />
    </main>
  );
}
