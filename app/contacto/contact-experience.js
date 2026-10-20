"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cable,
  MapPin,
  Network,
  Radio,
  Satellite,
} from "lucide-react";
import styles from "./contact-experience.module.css";
import Footer from "../footer";
import { sileo } from "../toaster";

const NAVIGATION = [
  { href: "/", label: "Inicio" },
  { href: "/#soluciones", label: "Soluciones" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "#formulario", label: "Contacto" },
];

const AREAS = [
  { icon: Cable, title: "Fibra óptica", text: "Splitters, patch cords y pigtails." },
  { icon: Radio, title: "CATV", text: "Equipos para redes de televisión por cable." },
  { icon: Satellite, title: "Satelital", text: "Componentes para sistemas satelitales." },
  { icon: Network, title: "Infraestructura", text: "Racks y accesorios para tu red." },
];

const STEPS = [
  { number: "01", title: "Cuéntanos qué necesitas", text: "Describe brevemente tu red, instalación o proyecto." },
  { number: "02", title: "Revisamos tu solicitud", text: "Nuestro equipo analiza el contexto y el equipo requerido." },
  { number: "03", title: "Te orientamos", text: "Conectamos contigo para definir los siguientes pasos." },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function ContactExperience() {
  const pageRef = useRef(null);
  const [activeArea, setActiveArea] = useState(0);

  useEffect(() => {
    const page = pageRef.current;
    const hero = document.getElementById("contacto-inicio");
    if (!page || !hero) return undefined;

    const updateScroll = ({ scroll = window.scrollY, limit, progress } = {}) => {
      const scrollable = Math.max(limit ?? document.documentElement.scrollHeight - window.innerHeight, 1);
      const pageProgress = typeof progress === "number" ? progress : clamp(scroll / scrollable);
      page.style.setProperty("--page-progress", pageProgress.toFixed(4));
      const heroRange = Math.max(hero.offsetHeight * 0.8, 1);
      hero.style.setProperty("--hero-progress", clamp(scroll / heroRange).toFixed(4));
    };

    const locomotive = new LocomotiveScroll({
      lenisOptions: {
        anchors: true,
        lerp: 0.085,
        respectReducedMotion: true,
        smoothTouch: false,
        smoothWheel: true,
      },
      scrollCallback: updateScroll,
    });

    updateScroll({ scroll: window.scrollY });
    return () => locomotive.destroy();
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = document.querySelector("[data-areas]");
    if (!target || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveArea(Math.min(AREAS.length - 1, Math.floor(entry.intersectionRatio * AREAS.length)));
          }
        });
      },
      { threshold: [0.1, 0.35, 0.6, 0.85] }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = `Consulta de proyecto · ${form.get("name")}`;
    const body = [
      `Nombre: ${form.get("name")}`,
      `Empresa: ${form.get("company") || "No indicada"}`,
      `Correo: ${form.get("email")}`,
      `Teléfono: ${form.get("phone") || "No indicado"}`,
      `Área de interés: ${form.get("area")}`,
      "",
      "Proyecto:",
      form.get("message"),
    ].join("\n");
    const recipient = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const hasRecipient = Boolean(process.env.NEXT_PUBLIC_CONTACT_EMAIL);
    sileo.show({
      type: "info",
      title: hasRecipient
        ? "Borrador preparado para el equipo Arconet."
        : "Borrador abierto.",
      description: hasRecipient
        ? undefined
        : "Añade el correo oficial de Arconet como destinatario antes de enviarlo.",
      duration: hasRecipient ? undefined : null,
      button: hasRecipient
        ? undefined
        : { title: "Copiar solicitud", onClick: copyDraft },
    });
  };

  const copyDraft = async () => {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const data = new FormData(form);
    const content = [
      `Nombre: ${data.get("name")}`,
      `Empresa: ${data.get("company") || "No indicada"}`,
      `Correo: ${data.get("email")}`,
      `Teléfono: ${data.get("phone") || "No indicado"}`,
      `Área de interés: ${data.get("area")}`,
      "",
      "Proyecto:",
      data.get("message"),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      sileo.success({ title: "Solicitud copiada al portapapeles." });
    } catch {
      sileo.error({ title: "No se pudo copiar el borrador." });
    }
  };

  return (
    <main className={styles.contactPage} ref={pageRef}>
      <div className={styles.readingProgress} aria-hidden="true" />
      <div className={styles.heroFrame}>
        <section id="contacto-inicio" className={styles.heroCard}>
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
            <a className={styles.logoTab} href="/" aria-label="Arconet, inicio">
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
            </a>
            <nav className={styles.navigation} aria-label="Navegación principal">
              {NAVIGATION.map((item, index) => (
                <a className={index === 3 ? styles.navigationActive : ""} href={item.href} key={item.label}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.headerActionTab}>
              <a className={styles.headerAction} href="#formulario">Hablemos <span><ArrowUpRight size={15} /></span></a>
            </div>
          </header>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Arconet · San Pedro Sula, Honduras</p>
            <h1>Tu próximo proyecto<br />empieza con <em>una conversación.</em></h1>
            <p>Cuéntanos qué quieres conectar. Te ayudamos a encontrar el equipo y la ruta correctos para tu red.</p>
            <a className={styles.heroAction} href="#formulario">Hablemos de tu proyecto <span><ArrowDown size={16} /></span></a>
          </div>

          <div className={styles.heroFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <a href="#areas">Desliza para descubrir <ArrowDown size={14} /></a>
          </div>
        </section>
      </div>

      <section id="areas" className={styles.areasSection} data-areas>
        <div className={styles.areasHeading} data-reveal>
          <p className={styles.sectionLabel}>01 / EMPECEMOS POR AQUÍ</p>
          <h2>¿Qué quieres<br /><em>poner en marcha?</em></h2>
          <p className={styles.areasIntro}>Cada instalación es distinta. Estas son algunas de las áreas en las que podemos orientarte.</p>
        </div>
        <div className={styles.areaList}>
          {AREAS.map(({ icon: Icon, title, text }, index) => (
            <a
              href="#formulario"
              className={`${styles.areaRow} ${activeArea === index ? styles.areaActive : ""}`}
              key={title}
              data-reveal
            >
              <span className={styles.areaIndex}>0{index + 1}</span>
              <span className={styles.areaIcon}><Icon size={19} strokeWidth={1.5} /></span>
              <span className={styles.areaCopy}><strong>{title}</strong><small>{text}</small></span>
              <ArrowUpRight className={styles.areaArrow} size={18} />
            </a>
          ))}
          <div className={styles.areaProgress} aria-hidden="true"><span style={{ transform: `scaleY(${(activeArea + 1) / AREAS.length})` }} /></div>
        </div>
      </section>

      <section className={styles.contactStory}>
        <div className={styles.storyVisual} data-reveal data-scroll data-scroll-speed="0.08">
          <Image
            src="/gabinete-rack-de-piso.png"
            alt="Gabinete rack de piso para infraestructura de red"
            width={472}
            height={910}
          />
          <span>AR / HN — 01</span>
        </div>
        <div className={styles.storyCopy} data-reveal>
          <p className={styles.sectionLabel}>02 / ASÍ TRABAJAMOS</p>
          <h2>Un buen proyecto<br />se construye <em>en equipo.</em></h2>
          <div className={styles.stepList}>
            {STEPS.map((step) => (
              <article className={styles.step} key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="formulario" className={styles.formSection}>
        <div className={styles.formIntro} data-reveal>
          <p className={styles.sectionLabel}>03 / CUÉNTANOS</p>
          <h2>¿Qué necesita<br /><em>tu red?</em></h2>
          <p>Déjanos el contexto de tu proyecto y prepara una solicitud para el equipo de Arconet.</p>
          <div className={styles.locationNote}><MapPin size={17} /><span><strong>San Pedro Sula, Cortés</strong><small>Atención a proyectos en Honduras</small></span></div>
        </div>

        <form id="contact-form" className={styles.contactForm} onSubmit={handleSubmit} data-reveal>
          <div className={styles.formTopline}><span>Solicitud de proyecto</span><span>HN · 2026</span></div>
          <div className={styles.formGrid}>
            <label>Nombre completo<input name="name" autoComplete="name" required placeholder="Tu nombre" /></label>
            <label>Empresa <span>Opcional</span><input name="company" autoComplete="organization" placeholder="Nombre de tu empresa" /></label>
            <label>Correo electrónico<input type="email" name="email" autoComplete="email" required placeholder="nombre@empresa.com" /></label>
            <label>Teléfono <span>Opcional</span><input type="tel" name="phone" autoComplete="tel" placeholder="+504" /></label>
            <label className={styles.formFull}>Área de interés
              <select name="area" defaultValue="Fibra óptica">
                {AREAS.map((area) => <option key={area.title}>{area.title}</option>)}
                <option>Otro proyecto</option>
              </select>
            </label>
            <label className={styles.formFull}>Cuéntanos sobre tu proyecto<textarea name="message" rows={4} required placeholder="¿Qué necesitas instalar, ampliar o conectar?" /></label>
          </div>
          <div className={styles.formSubmitRow}>
            <p>Al continuar se abrirá un borrador en tu aplicación de correo. No almacenamos tus datos en esta página.</p>
            <button type="submit">Preparar correo <ArrowUpRight size={16} /></button>
          </div>
        </form>
      </section>

      <section className={styles.lastWord} data-reveal>
        <span>Honduras · Conectividad que acerca</span>
        <a href="/catalogo">Explorar el catálogo <ArrowRight size={16} /></a>
      </section>

      <Footer />
    </main>
  );
}
