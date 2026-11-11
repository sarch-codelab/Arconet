"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { observeNativeScroll } from "@/lib/native-scroll";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
} from "lucide-react";
import styles from "./contact-experience.module.css";
import Footer from "../footer";
import NavDock from "../nav-dock";
import { STORE_NAVIGATION } from "../navigation-data";
import { sileo } from "../toaster";
import { useContact } from "../contact-provider";
import { copyText } from "@/lib/clipboard";


// Las áreas de interés siguen disponibles en el formulario, aunque la sección
// 01 ya no las enumere: ese bloque ahora es el mapa de ubicación.
const INTERESTS = [
  "Componentes pasivos",
  "Soluciones activas y Accesorios FTTH",
  "Gabinetes y Racks",
  "Herramientas y kits",
  "Microcables y Microproductos",
];

// Coordenada del local "4 Calle 11 Avenida, Barrio Guamilito": 15.5088,
// -88.0307, que cae sobre 4a Calle NO (verificado por geocodificación inversa)
// y coincide con el punto declarado en el listado del negocio. El pin anterior
// caía sobre el Instituto María Auxiliadora, en 11 Avenida NO, y señalaba un
// lugar equivocado.
const LOCATION = {
  address: "4 Calle 11 Avenida, Barrio Guamilito",
  city: "San Pedro Sula, Cortés · Honduras",
  hours: "Lun–Vie 8:00–17:00 · Sáb 8:00–12:00",
  latitude: 15.5088,
  longitude: -88.0307,
};

// OpenStreetMap no necesita clave de API. El bbox encuadra el barrio y el
// marcador queda en el centro; el enlace abre la ficha completa con el pin.
const MAP_BBOX = "-88.0352,15.5053,-88.0262,15.5123";
const MAP_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_BBOX}&layer=mapnik&marker=${LOCATION.latitude},${LOCATION.longitude}`;
const MAP_LINK = `https://www.openstreetmap.org/?mlat=${LOCATION.latitude}&mlon=${LOCATION.longitude}#map=17/${LOCATION.latitude}/${LOCATION.longitude}`;
const DIRECTIONS_LINK = `https://www.google.com/maps/dir/?api=1&destination=${LOCATION.latitude},${LOCATION.longitude}`;

const STEPS = [
  { number: "01", title: "Cuéntanos qué necesitas", text: "Describe brevemente tu red, instalación o proyecto." },
  { number: "02", title: "Revisamos tu solicitud", text: "Nuestro equipo analiza el contexto y el equipo requerido." },
  { number: "03", title: "Te orientamos", text: "Conectamos contigo para definir los siguientes pasos." },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function ContactExperience() {
  const { email: CONTACT_EMAIL } = useContact();
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    const hero = document.getElementById("contacto-inicio");
    if (!page || !hero) return undefined;

    let heroRange = 1;
    const measure = () => { heroRange = Math.max(hero.offsetHeight * 0.8, 1); };
    const updateScroll = ({ scroll, progress }) => {
      const pageProgress = progress;
      page.style.setProperty("--page-progress", pageProgress.toFixed(4));
      hero.style.setProperty("--hero-progress", clamp(scroll / heroRange).toFixed(4));
    };

    const scrollController = observeNativeScroll(updateScroll, { onResize: measure });

    return () => scrollController.destroy();
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
    window.location.assign(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    const hasRecipient = Boolean(CONTACT_EMAIL);
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
    if (await copyText(content)) {
      sileo.success({ title: "Solicitud copiada al portapapeles." });
    } else {
      sileo.error({
        title: "No se pudo copiar el borrador.",
        description: "El navegador restringe el portapapeles. Abre la vista previa en una pestaña nueva o selecciona el texto para copiarlo manualmente.",
      });
    }
  };

  return (
    <main className={styles.contactPage} ref={pageRef}>
      <div className={styles.readingProgress} aria-hidden="true" />
      <div className={styles.heroFrame}>
        <NavDock variant="hero" menuNumber={1} navigation={STORE_NAVIGATION} />
        <section id="contacto-inicio" className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image
              src="/contacto-asesoria-fibra.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
          </div>

          <div className={styles.heroHeader} aria-hidden="true" />

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Arconet · San Pedro Sula, Honduras</p>
            <h1>Tu próximo proyecto<br />empieza con <em>una conversación.</em></h1>
            <p>Cuéntanos qué quieres conectar. Te ayudamos a encontrar el equipo y la ruta correctos para tu red.</p>
            <a className={styles.heroAction} href="#formulario">Hablemos de tu proyecto <span><ArrowDown size={16} /></span></a>
          </div>

          <div className={styles.heroFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <a href="#ubicacion">Descubre dónde estamos <ArrowDown size={14} /></a>
          </div>
        </section>
      </div>

      <section id="ubicacion" className={styles.locationSection} aria-labelledby="ubicacion-titulo">
        <div className={styles.locationHeading} data-reveal>
          <p className={styles.sectionLabel}>01 / DÓNDE ESTAMOS</p>
          <h2 id="ubicacion-titulo">Visítanos en<br /><em>San Pedro Sula.</em></h2>
          <p className={styles.locationIntro}>Nuestro punto de atención está en Barrio Guamilito, a unas cuadras del centro. Pasa a conversar sobre tu proyecto o pide indicaciones para llegar.</p>
          <div className={styles.locationDetails}>
            <div className={styles.locationDetail}>
              <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
              <span><strong>{LOCATION.address}</strong><small>{LOCATION.city}</small></span>
            </div>
            <div className={styles.locationDetail}>
              <Clock size={18} strokeWidth={1.5} aria-hidden="true" />
              <span><strong>{LOCATION.hours}</strong><small>Atención a proyectos en todo Honduras</small></span>
            </div>
          </div>
          <div className={styles.locationActions}>
            <a className={styles.locationPrimary} href={MAP_LINK} target="_blank" rel="noopener noreferrer">Abrir mapa completo <ArrowUpRight size={16} /></a>
            <a className={styles.locationSecondary} href={DIRECTIONS_LINK} target="_blank" rel="noopener noreferrer">Cómo llegar <ArrowRight size={16} /></a>
          </div>
        </div>

        <figure className={styles.mapFrame} data-reveal>
          <div className={styles.mapTopLine}><span>ARCONET · BARRIO GUAMILITO</span><span>15.5088° N · 88.0307° O</span></div>
          <iframe
            className={styles.mapEmbed}
            src={MAP_EMBED}
            title="Mapa de ubicación de Arconet en Barrio Guamilito, San Pedro Sula"
            loading="lazy"
            referrerPolicy="no-referrer"
            aria-label="Mapa de OpenStreetMap centrado en 4 Calle y 11 Avenida, Barrio Guamilito"
          />
          <figcaption className={styles.mapCaption}>
            <span className={styles.mapPin} aria-hidden="true"><MapPin size={14} /></span>
            Mapa de OpenStreetMap · 4 Calle y 11 Avenida NO, Barrio Guamilito
          </figcaption>
        </figure>
      </section>

      <section className={styles.contactStory}>
        <div className={styles.storyVisual} data-reveal data-scroll data-scroll-speed="0.08">
          {/* `sizes`: la columna ocupa como mucho ~44vw y la imagen se pinta
              al 120% de ese ancho. Sin esto se servía la variante de 2176px
              (3.7 MB) para un hueco de unos 600px. */}
          <Image
            src="/neto-conducioendo.png"
            alt="Neto conduciendo"
            width={944}
            height={1820}
            sizes="(max-width: 760px) 110vw, 55vw"
            loading="lazy"
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
              <select name="area" defaultValue="Componentes pasivos">
                {INTERESTS.map((interest) => <option key={interest}>{interest}</option>)}
                <option>Otro proyecto</option>
              </select>
            </label>
            <label className={styles.formFull}>Cuéntanos sobre tu proyecto<textarea name="message" rows={4} required placeholder="¿Qué necesitas instalar, ampliar o conectar?" /></label>
          </div>
          <div className={styles.formSubmitRow}>
            <p>Al continuar se abrirá un borrador en tu aplicación de correo. Esta página no guarda los datos. Consulta nuestro <a href="/privacidad">aviso de privacidad</a>.</p>
            <button type="submit">Preparar correo <ArrowUpRight size={16} /></button>
          </div>
        </form>
      </section>

      <section className={styles.lastWord} data-reveal>
        <span>Honduras · Conectividad que acerca</span>
        <Link href="/tienda">Explorar el catálogo <ArrowRight size={16} /></Link>
      </section>

      <Footer />
    </main>
  );
}
