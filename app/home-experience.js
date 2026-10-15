"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cable,
  Network,
  Radio,
  Satellite,
} from "lucide-react";
import styles from "./page.module.css";

const NAVIGATION = [
  { id: "inicio", label: "Inicio" },
  { id: "soluciones", label: "Soluciones" },
  { id: "empresa", label: "La empresa" },
  { id: "contacto", label: "Contacto" },
];

const SOLUTIONS = [
  {
    number: "01",
    category: "Fibra óptica",
    title: "Más alcance.\nMenos límites.",
    description:
      "Componentes y accesorios para llevar conectividad confiable hasta donde tu proyecto la necesita.",
    image: "/splitters-opticos.png",
    imageAlt: "Splitter óptico de fibra azul",
    visual: "productVisual",
    icon: Cable,
  },
  {
    number: "02",
    category: "CATV y satélite",
    title: "Una señal clara\nlo cambia todo.",
    description:
      "Equipos para redes de televisión por cable y sistemas satelitales, seleccionados para cada instalación.",
    image: "/gabinete-rack-de-piso.png",
    imageAlt: "Gabinete rack para infraestructura de telecomunicaciones",
    visual: "rackVisual",
    icon: Satellite,
  },
  {
    number: "03",
    category: "Infraestructura",
    title: "El corazón de\nuna red sólida.",
    description:
      "Tecnología y accesorios para construir, ampliar y mantener la infraestructura de tu operación.",
    image: "/catalogo/infraestructura.jpg",
    imageAlt: "Cableado y equipos dentro de un centro de datos",
    visual: "photoVisual",
    icon: Network,
  },
  {
    number: "04",
    category: "Acompañamiento técnico",
    title: "El respaldo va\nmás allá del equipo.",
    description:
      "Asesoría para elegir la solución adecuada y hacer que cada inversión trabaje mejor para tu proyecto.",
    image: "/arconet.png",
    imageAlt: "Arconet, soluciones de conectividad",
    visual: "brandVisual",
    icon: Radio,
  },
];

const PRODUCT_LINES = [
  "Splitters ópticos",
  "Moduladores",
  "Patch cords y pigtails de fibra",
  "Medidores y accesorios",
  "Equipos CATV y satelitales",
];

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export default function HomeExperience() {
  const [activeSection, setActiveSection] = useState("inicio");
  const [activeSlide, setActiveSlide] = useState(0);
  const [scrollReady, setScrollReady] = useState(false);
  const trackRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const hero = document.getElementById("inicio");
    const stage = stageRef.current;

    const updateScrollEffects = () => {
      frame = 0;
      const y = window.scrollY;

      if (hero) {
        const range = Math.max(hero.offsetHeight * 0.9, 1);
        hero.style.setProperty("--zoom-progress", clamp(y / range).toFixed(4));
      }

      if (stage) {
        const range = Math.max(stage.offsetHeight - window.innerHeight, 1);
        const progress = clamp(-stage.getBoundingClientRect().top / range);
        stage.style.setProperty("--slide-progress", progress.toFixed(4));
        setActiveSlide(Math.min(SOLUTIONS.length - 1, Math.floor(progress * SOLUTIONS.length)));
      }

      const marker = NAVIGATION.slice().reverse().find((item) => {
        const section = document.getElementById(item.id);
        return section && section.getBoundingClientRect().top <= window.innerHeight * 0.44;
      });
      if (marker) setActiveSection((current) => current === marker.id ? current : marker.id);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollEffects);
    };

    updateScrollEffects();
    setScrollReady(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => target.classList.add(styles.revealVisible));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToSlide = (index) => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    setActiveSlide(index);
    if (window.matchMedia("(max-width: 760px)").matches) {
      track.scrollTo({ left: track.children[index]?.offsetLeft ?? 0, behavior: "smooth" });
      return;
    }

    const distance = stage.offsetHeight - window.innerHeight;
    const progress = index / (SOLUTIONS.length - 1);
    window.scrollTo({ top: stage.offsetTop + distance * progress, behavior: "smooth" });
  };

  const onTrackScroll = () => {
    if (!window.matchMedia("(max-width: 760px)").matches || !trackRef.current) return;
    const panel = trackRef.current.firstElementChild;
    if (!panel) return;
    const panelWidth = panel.getBoundingClientRect().width;
    setActiveSlide(clamp(Math.round(trackRef.current.scrollLeft / panelWidth), 0, SOLUTIONS.length - 1));
  };

  return (
    <main className={styles.experience}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#inicio" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
        </a>
        <nav className={styles.navigation} aria-label="Navegación principal">
          {NAVIGATION.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? styles.navigationActive : ""}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? "location" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a className={styles.topAction} href="#contacto">
          Hablemos <ArrowUpRight size={16} />
        </a>
      </header>

      <section id="inicio" className={styles.newHero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Tecnología que conecta</p>
          <h1>Infraestructura<br />para estar <em>más cerca.</em></h1>
          <p className={styles.heroDescription}>
            Soluciones en telecomunicaciones, fibra óptica y CATV para conectar negocios y comunidades en Honduras.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#soluciones">Explorar soluciones <ArrowRight size={16} /></a>
            <a className={styles.textAction} href="#empresa">Conoce Arconet <ArrowUpRight size={16} /></a>
          </div>
          <div className={styles.heroCoordinates}>
            <span>15°30&apos; N</span><i /><span>San Pedro Sula, Honduras</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Infraestructura tecnológica">
          <div className={styles.heroPhoto}>
            <Image
              src="/catalogo/infraestructura.jpg"
              alt="Cableado de fibra e infraestructura en un centro de datos"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 58vw"
            />
          </div>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroSignal} aria-hidden="true"><span /><span /><span /></div>
          <div className={styles.heroRack}>
            <Image src="/gabinete-rack-de-piso.png" alt="" width={472} height={910} priority sizes="(max-width: 760px) 48vw, 28vw" />
          </div>
          <div className={styles.heroProduct}>
            <Image src="/splitters-opticos.png" alt="" width={455} height={829} priority sizes="(max-width: 760px) 24vw, 12vw" />
            <span>Fibra óptica<br /><strong>Conexiones precisas</strong></span>
          </div>
          <div className={styles.heroStamp}><Network size={17} /><span>Redes<br />que conectan</span></div>
          <span className={styles.heroSerial}>AR / 01 — 2026</span>
        </div>

        <a className={styles.scrollCue} href="#soluciones"><span>Desliza para descubrir</span><ArrowDown size={15} /></a>
      </section>

      <section className={styles.capabilityBar} aria-label="Áreas de especialidad">
        <p>Conectividad<br />con propósito</p>
        <div><Cable size={20} /><span>Fibra óptica</span></div>
        <div><Radio size={20} /><span>CATV</span></div>
        <div><Satellite size={20} /><span>Satelital</span></div>
        <div><Network size={20} /><span>Telecomunicaciones</span></div>
      </section>

      <section
        id="soluciones"
        ref={stageRef}
        className={`${styles.solutionsStage} ${scrollReady ? styles.scrollReady : ""}`}
        aria-label="Soluciones de Arconet"
      >
        <div className={styles.solutionsSticky}>
          <div className={styles.solutionsHeading}>
            <div><p className={styles.stageEyebrow}>Lo que hace posible una conexión</p><h2>Soluciones <span>en movimiento.</span></h2></div>
            <div className={styles.slideProgress} aria-live="polite">
              <span>0{activeSlide + 1}</span><i><b style={{ transform: `scaleX(${(activeSlide + 1) / SOLUTIONS.length})` }} /></i><span>0{SOLUTIONS.length}</span>
            </div>
          </div>

          <div ref={trackRef} className={styles.solutionTrack} onScroll={onTrackScroll}>
            {SOLUTIONS.map((solution) => {
              const Icon = solution.icon;
              return (
                <article className={styles.solutionPanel} key={solution.number}>
                  <div className={styles.solutionCopy}>
                    <div className={styles.solutionMeta}><span>{solution.number}</span><i /><span>{solution.category}</span></div>
                    <h3>{solution.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
                    <p>{solution.description}</p>
                    <div className={styles.solutionLink}><Icon size={18} /><span>Arconet <b>Honduras</b></span><ArrowRight size={16} /></div>
                  </div>
                  <div className={`${styles.solutionVisual} ${styles[solution.visual]}`}>
                    {solution.visual === "brandVisual" ? (
                      <>
                        <div className={styles.brandOrbital} aria-hidden="true"><i /><i /><i /></div>
                        <Image src={solution.image} alt={solution.imageAlt} width={2172} height={362} className={styles.brandLogo} />
                        <span className={styles.brandNote}>Desde San Pedro Sula<br />para conectar Honduras.</span>
                      </>
                    ) : (
                      <Image
                        src={solution.image}
                        alt={solution.imageAlt}
                        fill
                        sizes="(max-width: 760px) 82vw, 45vw"
                        className={styles.solutionImage}
                      />
                    )}
                    <span className={styles.visualIndex}>{solution.number}<i />ARCONET</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.stageFooter}>
            <span className={styles.stageHint}><span className={styles.stageHintLine} /> {scrollReady ? "Scroll para recorrer" : "Desliza para recorrer"}</span>
            <div className={styles.slideDots} aria-label="Elegir solución">
              {SOLUTIONS.map((solution, index) => (
                <button
                  type="button"
                  key={solution.number}
                  className={activeSlide === index ? styles.slideDotActive : ""}
                  aria-label={`Ver ${solution.category}`}
                  aria-current={activeSlide === index ? "step" : undefined}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="empresa" className={styles.companySection}>
        <div className={styles.companyIntro} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Nuestra experiencia</p>
          <h2>La tecnología es importante.<br /><em>Quién te acompaña, también.</em></h2>
          <p className={styles.companyText}>
            Arconet, S.A. es una empresa hondureña con sede en San Pedro Sula, Cortés. Distribuimos, importamos y brindamos soporte para equipos y accesorios de televisión por cable, fibra óptica y telecomunicaciones.
          </p>
        </div>
        <div className={styles.companyDetails} data-reveal>
          <div className={styles.productsHeading}><span>01 / NUESTRO CATÁLOGO</span><h3>Todo empieza con<br />el equipo adecuado.</h3></div>
          <ul className={styles.productList}>
            {PRODUCT_LINES.map((product, index) => (
              <li key={product}><span>0{index + 1}</span><strong>{product}</strong><ArrowUpRight size={17} /></li>
            ))}
          </ul>
          <a className={styles.catalogLink} href="/catalogo">Explorar catálogo <ArrowRight size={16} /></a>
        </div>
      </section>

      <section id="contacto" className={styles.contactSection}>
        <div className={styles.contactGrid} aria-hidden="true" />
        <div className={styles.contactContent} data-reveal>
          <p className={styles.contactEyebrow}>Tu próximo proyecto empieza aquí</p>
          <h2>Hagamos que<br /><em>todo conecte.</em></h2>
          <p>Cuéntanos qué necesita tu red. Nuestro equipo puede ayudarte a encontrar el equipo y la solución correctos.</p>
          <a href="/catalogo" className={styles.contactAction}>Ver productos y soluciones <ArrowUpRight size={17} /></a>
        </div>
        <div className={styles.contactMark} aria-hidden="true"><Image src="/linea-1.png" alt="" width={329} height={1920} /></div>
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <footer className={styles.footer}>
        <a href="#inicio" className={styles.footerBrand}><Image src="/arconet.png" alt="Arconet" width={2172} height={362} /></a>
        <p>Conectividad que acerca.</p>
        <a href="#inicio" className={styles.backToTop}>Volver al inicio <ArrowUpRight size={15} /></a>
        <span className={styles.footerCopyright}>© 2026 Arconet, S.A. · Honduras</span>
      </footer>
    </main>
  );
}