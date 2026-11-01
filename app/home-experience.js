"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cable,
  Network,
  Award,
  Cctv,
  Factory,
  Globe2,
  GraduationCap,
  Handshake,
  Headset,
  HeartHandshake,
  Landmark,
  Lightbulb,
  LogIn,
  PackageCheck,
  Radio,
  Satellite,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Eye,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import styles from "./page.module.css";
import Footer from "./footer";
import { CONTACT_PHONE } from '@/lib/contact';

const NAVIGATION = [
  { id: "inicio", label: "Inicio", href: "#inicio", mega: false },
  { id: "soluciones", label: "Soluciones", href: "#soluciones", mega: true, megaGroups: [
    { title: "Red óptica y FTTH", links: [
      { label: "Soluciones de Preconectorizado", href: "/tienda/soluciones-de-preconectorizado" },
      { label: "Cajas de Distribución y Emplazamiento", href: "/tienda/cajas-de-distribucion-y-emplazamiento" },
      { label: "Soluciones activas y Accesorios FTTH", href: "/tienda/soluciones-activas-y-accesorios-ftth" },
      { label: "Componentes pasivos", href: "/tienda/componentes-pasivos" },
      { label: "Microcables y Microproductos", href: "/tienda/microcables-y-microproductos" }
    ]},
    { title: "Infraestructura", links: [
      { label: "Gabinetes y Racks", href: "/tienda/gabinetes-y-racks" },
      { label: "Herrajes", href: "/tienda/herrajes" },
      { label: "Escaleras", href: "/tienda/escaleras" },
      { label: "Optical Distribution Frame - ODF", href: "/tienda/optical-distribution-frame-odf" }
    ]},
    { title: "Medición y herramientas", links: [
      { label: "Instrumentos de medición óptica", href: "/tienda/instrumentos-de-medicion-optica" },
      { label: "Herramientas y kits", href: "/tienda/herramientas-y-kits" }
    ]},
    { title: "Más de Arconet", links: [
      { label: "La empresa", href: "/#empresa" },
      { label: "Misión y visión", href: "/#mision" },
      { label: "Términos de uso", href: "/terminos" }
    ]}
  ]},
  { label: "Tienda", href: "/tienda", mega: false },
  { id: "empresa", label: "La empresa", href: "#empresa", mega: false },
  { id: "compania", label: "Nosotros", href: "#compania", mega: false },
  { label: "Contacto", href: "/contacto", mega: false },
];

const SOLUTIONS = [
  {
    number: "01",
    category: "Componentes pasivos",
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
    category: "Soluciones activas y Accesorios FTTH",
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
    category: "Gabinetes y Racks",
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

// Las categorías ya no se escriben a mano: llegan de la base de datos
// (tabla Categoria) desde app/page.js y se listan en el orden del panel.

const STATS = [
  { value: "+10", label: "Años conectando Honduras" },
  { value: "5", label: "Líneas de producto especializadas" },
  { value: "18", label: "Departamentos con cobertura" },
  { value: "2", label: "Sedes: San Pedro Sula y Tegucigalpa" },
  { value: "100%", label: "Calidad y garantía respaldada" },
];

const STORY_FACTS = [
  {
    icon: Landmark,
    label: "Sede principal",
    value: "4 Calle 11 Avenida, Barrio Guamilito, San Pedro Sula, Cortés.",
  },
  { value: CONTACT_PHONE, label: "Atención al cliente" },
  { value: "Lun–Vie 8:00–17:00 · Sáb 8:00–12:00", label: "Horario de atención" },
  { value: "San Pedro Sula y Tegucigalpa", label: "Sedes y puntos de atención" },
  { value: "Todo Honduras", label: "Cobertura de entrega" },
  { value: "Distribución de equipos para telecomunicaciones", label: "Especialidad" },
];

const MISSION = {
  mission:
    "Acercar la tecnología de telecomunicaciones a cada rincón de Honduras, entregando equipos de la mejor calidad y una asesoría honesta que ayude a nuestros clientes a construir redes confiables, modernas y hechas para durar.",
  vision:
    "Ser el aliado de telecomunicaciones más confiable del país: la primera opción de instaladores, operadores e integradores que buscan calidad, respaldo técnico y un servicio cercano que los impulse a ir más lejos.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Calidad y garantía",
    text: "Seleccionamos cada producto pensando en el campo. Lo que sale de nuestra bodega está respaldado.",
  },
  {
    icon: Headset,
    title: "Asesoría de principio a fin",
    text: "Revisamos tu proyecto contigo y te acompañamos antes, durante y después de la compra.",
  },
  {
    icon: HeartHandshake,
    title: "Cercanía hondureña",
    text: "Somos de aquí, conocemos el terreno y respondemos cuando de verdad lo necesitas.",
  },
  {
    icon: Lightbulb,
    title: "Innovación constante",
    text: "Incorporamos nuevas tecnologías para que tu red nunca se quede atrás.",
  },
  {
    icon: Handshake,
    title: "Integridad y transparencia",
    text: "Precios claros, información real y el compromiso de cumplir lo que prometemos.",
  },
  {
    icon: TrendingUp,
    title: "Crecimiento compartido",
    text: "Tu proyecto crece y nosotros crecemos contigo: ganamos cuando tú avanzas.",
  },
];

const SECTORS = [
  {
    icon: Wifi,
    title: "Operadores de fibra óptica",
    text: "Equipos y accesorios para redes FTTH, PON y enlaces de alta capacidad.",
  },
  {
    icon: Satellite,
    title: "TV por cable y satélite",
    text: "Moduladores, amplificadores y coaxial para entregar señal limpia a cada usuario.",
  },
  {
    icon: Wrench,
    title: "Integradores y contratistas",
    text: "Componentes listos para cada etapa de la instalación, sin frenar tu trabajo.",
  },
  {
    icon: Cctv,
    title: "Videovigilancia y CCTV",
    text: "Conectividad estable para sistemas de seguridad y monitoreo continuo.",
  },
  {
    icon: Factory,
    title: "Empresas e industria",
    text: "Infraestructura de red para operaciones que no pueden detenerse.",
  },
  {
    icon: Landmark,
    title: "Gobierno y educación",
    text: "Soluciones para instituciones y proyectos que conectan comunidades.",
  },
];

const COVERAGE = [
  "San Pedro Sula",
  "Tegucigalpa",
  "La Ceiba",
  "Choloma",
  "El Progreso",
  "Puerto Cortés",
  "Tela",
  "Comayagua",
  "Siguatepeque",
  "Santa Rosa de Copán",
  "Choluteca",
  "Danlí",
  "Juticalpa",
  "Tocoa",
  "Yoro",
  "Gracias a Dios",
];

const COMMITMENTS = [
  {
    icon: PackageCheck,
    title: "Importación directa",
    text: "Traemos el equipo sin intermediarios de más, con mejor precio y disponibilidad constante.",
  },
  {
    icon: Award,
    title: "Garantía real",
    text: "Cada producto que sale de nuestra bodega está respaldado por nuestro compromiso.",
  },
  {
    icon: Truck,
    title: "Entrega nacional",
    text: "Coordinamos la entrega donde esté tu proyecto, en cualquier departamento del país.",
  },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const TIME_IMAGES = {
  manana: "/neto-manana.png",
  tarde: "/neto-tarde.png",
  noche: "/neto-noche.png",
};

function getTimeOfDay() {
  if (typeof window === "undefined") return "manana";
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "manana";
  if (hour >= 12 && hour < 19) return "tarde";
  return "noche";
}

export default function HomeExperience({ categorias = [] }) {
  const [timeOfDay, setTimeOfDay] = useState("manana");
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [activeSlide, setActiveSlide] = useState(0);
  const [scrollReady, setScrollReady] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Desplegable de "Acceder": se abre al pasar el mouse o al enfocar con
  // teclado, y se cierra al salir del área o con Escape.
  const [accessOpen, setAccessOpen] = useState(false);
  // Desplegable de "Soluciones" del menú 1 (el que vive dentro del hero).
  // El panel se dibuja con position: fixed porque el hero recorta con
  // overflow: hidden y un absoluto quedaría cortado.
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const heroTriggerRef = useRef(null);
  const [heroPanelPos, setHeroPanelPos] = useState({ left: 0, top: 0 });
useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMounted(true);
    const updateTimeOfDay = () => setTimeOfDay(getTimeOfDay());
    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const locomotiveRef = useRef(null);
  const navRef = useRef(null);
  const topbarRef = useRef(null);
  const menuToggleRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Posiciona el panel de Soluciones del menú 1 justo debajo de su botón.
  // Va en fixed para que el overflow: hidden del hero no lo recorte.
  useEffect(() => {
    if (!heroMenuOpen) return undefined;

    const colocar = () => {
      const trigger = heroTriggerRef.current;
      if (!trigger) return;
      const caja = trigger.getBoundingClientRect();
      const ancho = Math.min(1080, window.innerWidth - 32);
      // Centrado sobre el disparador, sin salirse de la pantalla.
      const left = Math.max(16, Math.min(caja.left + caja.width / 2 - ancho / 2, window.innerWidth - ancho - 16));
      setHeroPanelPos({ left, top: caja.bottom + 10 });
    };

    const alClicFuera = (event) => {
      const trigger = heroTriggerRef.current;
      if (trigger && !trigger.contains(event.target) && !event.target.closest?.(`.${styles.cardMegaPanel}`)) {
        setHeroMenuOpen(false);
      }
    };
    const alDesplazar = () => setHeroMenuOpen(false);

    colocar();
    document.addEventListener("pointerdown", alClicFuera);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", colocar);

    return () => {
      document.removeEventListener("pointerdown", alClicFuera);
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", colocar);
    };
  }, [heroMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const trigger = document.activeElement;

    if (isMobile()) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccessOpen(false);
        setHeroMenuOpen(false);
        if (trigger instanceof HTMLElement && trigger.isConnected) {
          trigger.focus({ preventScroll: true });
        } else {
          menuToggleRef.current?.focus();
        }
      }
    };

    const handlePointerDown = (event) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);

    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    let frame = 0;
    const hero = document.getElementById("inicio");
    const stage = stageRef.current;
    const topbar = topbarRef.current;

    const updateScrollEffects = () => {
      frame = 0;
      const y = window.scrollY;

      setScrolledPastHero(y > 360);

      if (topbar) {
        const scrollable = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );
        topbar.style.setProperty("--scroll-progress", clamp(y / scrollable).toFixed(4));
      }

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

    const locomotive = new LocomotiveScroll({
      lenisOptions: {
        anchors: true,
        gestureOrientation: "vertical",
        // 0.085 dejaba la inercia muy larga: cada golpe de rueda seguía
        // deslizándose y al encadenar varios se sentía "trabado". Con 0.11
        // el desplazamiento acompaña al mouse sin arrastrarse.
        lerp: 0.11,
        respectReducedMotion: true,
        smoothTouch: false,
        smoothWheel: true,
      },
      scrollCallback: onScroll,
    });
    locomotiveRef.current = locomotive;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      locomotiveRef.current = null;
      locomotive.destroy();
    };
  }, []);

  // Indicador deslizante del dock: sigue al enlace de la sección activa.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const syncIndicator = () => {
      const active = nav.querySelector('[data-active="true"]');
      if (!active || !active.offsetWidth) {
        nav.style.setProperty("--nav-indicator-opacity", "0");
        return;
      }
      nav.style.setProperty("--nav-indicator-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--nav-indicator-w", `${active.offsetWidth}px`);
      nav.style.setProperty("--nav-indicator-opacity", "1");
    };

    syncIndicator();
    window.addEventListener("resize", syncIndicator);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(syncIndicator);
      observer.observe(nav);
    }

    return () => {
      window.removeEventListener("resize", syncIndicator);
      observer?.disconnect();
    };
  }, [activeSection, menuOpen, scrollReady]);

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

  // Revelado tipografico: los titulos marcados con data-split se parten en
  // palabras y cada una sube en cascada al entrar en pantalla. Se hace en el
  // cliente para no romper el HTML del servidor (SEO y lectores de pantalla
  // siguen viendo el texto completo).
  useEffect(() => {
    const titulos = document.querySelectorAll("[data-split]");
    if (!titulos.length) return undefined;

    const reducido =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    titulos.forEach((titulo) => {
      if (titulo.dataset.splitDone) return;
      titulo.dataset.splitDone = "true";

      // Se recorre el árbol respetando los elementos anidados (<em>, <span>,
      // <br>): si se usara textContent se perdería el color y el estilo de la
      // segunda línea de cada título.
      let indice = 0;
      const envolver = (padre) => {
        const hijos = Array.from(padre.childNodes);
        hijos.forEach((nodo) => {
          if (nodo.nodeType === 1) {
            if (nodo.tagName === "BR") return;
            envolver(nodo);
            return;
          }
          if (nodo.nodeType !== 3) return;
          const trozos = (nodo.textContent || "").split(/(\s+)/);
          if (!trozos.some((t) => t.trim())) return;

          const fragmento = document.createDocumentFragment();
          trozos.forEach((trozo) => {
            if (!trozo) return;
            if (!trozo.trim()) {
              fragmento.appendChild(document.createTextNode(" "));
              return;
            }
            const exterior = document.createElement("span");
            exterior.className = styles.palabra;
            const interior = document.createElement("span");
            interior.className = styles.palabraInterior;
            interior.textContent = trozo;
            interior.style.setProperty("--retraso", `${Math.min(indice * 45, 620)}ms`);
            exterior.appendChild(interior);
            fragmento.appendChild(exterior);
            indice += 1;
          });
          padre.replaceChild(fragmento, nodo);
        });
      };

      envolver(titulo);
      if (!indice) return;

      if (reducido) titulo.classList.add(styles.palabrasListas);
    });

    if (reducido) return undefined;

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add(styles.palabrasListas);
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    titulos.forEach((titulo) => observador.observe(titulo));
    return () => observador.disconnect();
  }, []);

  const goTo = (id) => {
    const locomotive = locomotiveRef.current;
    if (locomotive) {
      locomotive.scrollTo(`#${id}`);
      return;
    }
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
    const top = stage.offsetTop + distance * progress;
    const locomotive = locomotiveRef.current;
    if (locomotive) {
      locomotive.scrollTo(top);
      return;
    }
    window.scrollTo({ top, behavior: "smooth" });
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
      {/* Panel de Soluciones del menú 1: mismo contenido que el menú de
          escritorio. Vive fuera del hero, en <main>, porque el hero recorta
          con overflow: hidden y un panel interno quedaría cortado. */}
      {NAVIGATION.some((item) => item.mega) && (
        <div
          className={`${styles.cardMegaPanel}${
            heroMenuOpen ? ` ${styles.cardMegaPanelOpen}` : ""
          }`}
          style={{ left: `${heroPanelPos.left}px`, top: `${heroPanelPos.top}px` }}
          role="menu"
          aria-label="Soluciones"
          onMouseLeave={() => setHeroMenuOpen(false)}
        >
          <div className={styles.cardMegaGroups}>
            {NAVIGATION.filter((item) => item.mega).map((item) =>
              item.megaGroups.map((group) => (
                <section key={`${item.id}-${group.title}`} className={styles.cardMegaGroup}>
                  <h4>{group.title}</h4>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} role="menuitem">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
          <a className={styles.cardMegaAll} href="/tienda">
            Ver la tienda completa
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      )}

      {/* Dock de navegación secundaria: aparece al superar el hero */}
      <header
        ref={topbarRef}
        className={`${styles.topbar}${menuOpen ? ` ${styles.topbarMenuOpen}` : ""} ${
          scrolledPastHero || menuOpen ? styles.topbarVisible : styles.topbarHidden
        }`}
        aria-hidden={!(scrolledPastHero || menuOpen)}
      >
        <span className={styles.scrollProgress} aria-hidden="true">
          <i />
        </span>

        <div className={styles.topbarShell}>
          <a className={styles.brand} href="#inicio" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </a>

          <nav className={styles.navigation} aria-label="Navegación principal" ref={navRef}>
            <span className={styles.navIndicator} aria-hidden="true" />
            {NAVIGATION.map((item) => {
              const isActive = Boolean(item.id) && activeSection === item.id;
              return (
                <a
                  key={item.id ?? item.label}
                  data-active={isActive ? "true" : "false"}
                  className={`${isActive ? styles.navigationActive : ""}${item.mega ? ` ${styles.megaTrigger}` : ""}`}
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                >
                  {item.label}
                </a>
              );
            })}
            <button
              ref={menuToggleRef}
              type="button"
              className={`${styles.menuToggle}${menuOpen ? ` ${styles.menuToggleActive}` : ""}`}
              aria-expanded={menuOpen}
              aria-controls="home-mobile-menu"
              aria-haspopup="true"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>
          </nav>

          <div
            className={styles.accessMenu}
            onMouseEnter={() => setAccessOpen(true)}
            onMouseLeave={() => setAccessOpen(false)}
            onFocus={() => setAccessOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAccessOpen(false);
            }}
          >
            <button
              type="button"
              className={styles.topAction}
              aria-haspopup="true"
              aria-expanded={accessOpen}
              aria-label="Acceder al sistema"
            >
              <span>Acceder</span>
              <span className={styles.topActionIcon}>
                <ArrowUpRight size={15} />
              </span>
            </button>
            <div className={styles.accessMenuPanel} role="menu" aria-label="Acceder">
              <a className={styles.accessMenuLogin} href="/login" role="menuitem">
                <LogIn size={16} aria-hidden="true" />
                <span>
                  <strong>Login</strong>
                  <small>Portal de clientes</small>
                </span>
              </a>
              <a className={styles.accessMenuAdmin} href="/admin" role="menuitem">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  <strong>Admin</strong>
                  <small>Panel administrativo</small>
                </span>
              </a>
            </div>
          </div>

          {/* Menú de escritorio: misma estructura y piezas que el menú de
              móvil (acceso destacado a la tienda, Login/Admin y grupos), pero
              en rejilla ancha y con fondo translúcido para el escritorio. */}
          {NAVIGATION.some((item) => item.mega) && (
            <div className={styles.desktopMenu} aria-label="Menú desplegable">
              <div className={styles.desktopMenuTop}>
                <a className={styles.desktopMenuPrimary} href="/tienda">
                  <span className={styles.desktopMenuPrimaryText}>
                    <span className={styles.desktopMenuPrimaryLabel}>Tienda</span>
                    <span className={styles.desktopMenuPrimaryHint}>Explora todos los productos</span>
                  </span>
                  <span className={styles.desktopMenuPrimaryIcon}>
                    <ArrowRight size={18} aria-hidden="true" />
                  </span>
                </a>

                <div className={styles.desktopMenuAuth}>
                  <a className={styles.desktopMenuLogin} href="/login">
                    <LogIn size={16} aria-hidden="true" />
                    Login
                  </a>
                  <a className={styles.desktopMenuAdmin} href="/admin">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Admin
                  </a>
                </div>
              </div>

              <div className={styles.desktopMenuGroups}>
                {NAVIGATION.filter((item) => item.mega).map((item) =>
                  item.megaGroups.map((group) => (
                    <section key={`${item.id}-${group.title}`} className={styles.desktopMenuGroup}>
                      <h4>{group.title}</h4>
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.label}>
                            <a href={link.href}>{link.label}</a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                )}
              </div>

              {/* Mismo cierre que el menú de móvil: enlaces legales. El pie
                  anterior ("Inventario técnico listo para cotizar…") se retiró
                  porque el pedido era sustituir el bloque completo. */}
              <div className={styles.desktopMenuLegal}>
                <a href="/terminos">Términos</a>
                <a href="/privacidad">Privacidad</a>
                <a href="/ayuda">Ayuda</a>
              </div>
            </div>
          )}

          {menuOpen && (
            <nav
              id="home-mobile-menu"
              ref={mobileMenuRef}
              className={styles.mobileMenu}
              aria-label="Menú de navegación móvil"
              tabIndex={-1}
            >
              <div className={styles.mobileMenuHead}>
                <span className={styles.mobileMenuEyebrow}>Navegación</span>
                <button
                  type="button"
                  className={styles.mobileMenuClose}
                  onClick={() => {
                    setMenuOpen(false);
                    menuToggleRef.current?.focus();
                  }}
                  aria-label="Cerrar menú"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>

              <a
                className={styles.mobileMenuPrimary}
                href="/tienda"
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.mobileMenuPrimaryText}>
                  <span className={styles.mobileMenuPrimaryLabel}>Tienda</span>
                  <span className={styles.mobileMenuPrimaryHint}>Explora todos los productos</span>
                </span>
                <span className={styles.mobileMenuPrimaryIcon}>
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </a>

              <div className={styles.mobileMenuAuth}>
                <a
                  className={styles.mobileMenuLogin}
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                >
                  <LogIn size={16} aria-hidden="true" />
                  Login
                </a>
                <a
                  className={styles.mobileMenuAdmin}
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                  Admin
                </a>
              </div>

              <div className={styles.mobileMenuLinks}>
                {NAVIGATION.filter((item) => item.href !== "/tienda").map((item) =>
                  item.mega ? (
                    <div key={item.id ?? item.label} className={styles.mobileMenuGroup}>
                      <a
                        className={styles.mobileMenuGroupTitle}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                      {item.megaGroups.map((group) => (
                        <div key={group.title} className={styles.mobileMenuSubgroup}>
                          <strong>{group.title}</strong>
                          {group.links.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              onClick={() => setMenuOpen(false)}
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <a
                      key={item.id ?? item.label}
                      className={styles.mobileMenuLink}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  )
                )}
              </div>
              <div className={styles.mobileMenuLegal}>
                <a href="/terminos" onClick={() => setMenuOpen(false)}>Términos</a>
                <a href="/privacidad" onClick={() => setMenuOpen(false)}>Privacidad</a>
                <a href="/ayuda" onClick={() => setMenuOpen(false)}>Ayuda</a>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Full screen rounded hero */}
      <div className={styles.heroFrame}>
        <section id="inicio" className={styles.heroCard}>
          <h1 className={styles.visuallyHidden}>Arconet</h1>
          {/* Background company image replacing the sofa */}
          <div className={styles.heroBgMedia}>
            <Image
              src="/empresa.webp"
              alt="Instalaciones Arconet S.A. en San Pedro Sula"
              fill
              priority
              quality={90}
              className={styles.heroBgImg}
              sizes="100vw"
            />
            <div className={styles.heroOverlay} />
          </div>

          {/* Header with left logo cutout tab, center dark nav, and right action cutout tab */}
          <header className={styles.cardHeader}>
            <div className={styles.cardLogoTab}>
              <a className={styles.cardBrand} href="#inicio" aria-label="Arconet, inicio">
                <Image
                  src="/arconet.png"
                  alt="Arconet"
                  width={362}
                  height={60}
                  className={styles.heroLogoImg}
                  priority
                />
              </a>
            </div>

            <nav className={styles.cardCenterNav} aria-label="Navegación del hero">
              {NAVIGATION.map((item) =>
                item.mega ? (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.cardMegaTrigger}${
                      activeSection === item.id ? ` ${styles.cardNavActive}` : ""
                    }${heroMenuOpen ? ` ${styles.cardMegaTriggerOpen}` : ""}`}
                    ref={heroTriggerRef}
                    aria-expanded={heroMenuOpen}
                    aria-haspopup="true"
                    onClick={() => setHeroMenuOpen((open) => !open)}
                    onMouseEnter={() => setHeroMenuOpen(true)}
                  >
                    {item.label}
                  </button>
                ) : (
                  <a
                    key={item.id ?? item.label}
                    className={activeSection === item.id ? styles.cardNavActive : ""}
                    href={item.href}
                  >
                    {item.label}
                  </a>
                )
              )}
            </nav>

            <button
              type="button"
              className={`${styles.cardMenuToggle}${menuOpen ? ` ${styles.menuToggleActive}` : ""}`}
              aria-expanded={menuOpen}
              aria-controls="home-mobile-menu"
              aria-haspopup="true"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>

            <div className={styles.cardActionTab}>
              <div
                className={styles.accessMenu}
                onMouseEnter={() => setAccessOpen(true)}
                onMouseLeave={() => setAccessOpen(false)}
                onFocus={() => setAccessOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setAccessOpen(false);
                }}
              >
                <button
                  type="button"
                  className={styles.cardTopPill}
                  aria-haspopup="true"
                  aria-expanded={accessOpen}
                  aria-label="Acceder al sistema"
                >
                  <span>Acceder</span>
                  <span className={styles.cardTopPillIcon}>
                    <ArrowUpRight size={14} />
                  </span>
                </button>
                <div className={styles.accessMenuPanel} role="menu" aria-label="Acceder">
                  <a className={styles.accessMenuLogin} href="/login" role="menuitem">
                    <LogIn size={16} aria-hidden="true" />
                    <span>
                      <strong>Login</strong>
                      <small>Portal de clientes</small>
                    </span>
                  </a>
                  <a className={styles.accessMenuAdmin} href="/admin" role="menuitem">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>
                      <strong>Admin</strong>
                      <small>Panel administrativo</small>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* Bottom Bar inside Card */}
          <div className={styles.cardBottomBar}>
            <div className={styles.cardCoordinates}>
              <span>15°30&apos; N</span>
              <i />
              <span>San Pedro Sula, Honduras</span>
            </div>
            <a className={styles.cardScrollCue} href="#soluciones">
              <span>Desliza para descubrir</span>
              <ArrowDown size={14} />
            </a>
          </div>
        </section>
      </div>

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
            <div><p className={styles.stageEyebrow}>Lo que hace posible una conexión</p><h2 data-split>Soluciones <span>en movimiento.</span></h2></div>
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
          <h2 data-split>La tecnología es importante.<br /><em>Quién te acompaña, también.</em></h2>
          <p className={styles.companyText}>
            Arconet, S.A. es una empresa hondureña con sede en San Pedro Sula, Cortés. Distribuimos, importamos y brindamos soporte para equipos y accesorios de televisión por cable, fibra óptica y telecomunicaciones.
          </p>
        </div>
        <div className={styles.companyDetails} data-reveal>
          <div className={styles.productsHeading}><span>01 / NUESTRAS CATEGORÍAS</span><h3 data-split>Todo empieza con<br />el equipo adecuado.</h3></div>
          <ul className={styles.productList}>
            {categorias.map((categoria, index) => (
              <li key={categoria.id}>
                <a href={categoria.href}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{categoria.nombre}</strong>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.statsBand} aria-label="Arconet en números">
        {STATS.map((stat) => (
          <div key={stat.label} className={styles.statItem} data-reveal>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section id="compania" className={styles.storySection}>
        <div className={styles.storyCopy} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Quiénes somos</p>
          <h2 data-split>Más que una distribuidora.<br /><em>Un aliado para tu red.</em></h2>
          <p className={styles.storyLead}>
            Arconet, de la mano de <strong>Arcolab, S.A.</strong>, es la casa de soluciones de
            telecomunicaciones que acompaña a instaladores, operadores e integradores en todo Honduras.
          </p>
          <p className={styles.storyText}>
            Importamos, distribuimos y damos soporte a equipos y accesorios para fibra óptica,
            televisión por cable, sistemas satelitales, videovigilancia y redes de datos. Desde
            nuestra sede en San Pedro Sula coordinamos entregas en los 18 departamentos del país,
            con la asesoría técnica que marca la diferencia entre una instalación que funciona y
            una que perdura.
          </p>
          <p className={styles.storyText}>
            Creemos que detrás de cada conexión hay un proyecto, una familia o un negocio que
            necesita avanzar. Por eso trabajamos con estándares de calidad, precios honestos y un
            equipo que responde cuando de verdad se le necesita.
          </p>
          <div className={styles.storyActions}>
            <a className={styles.storyActionPrimary} href="/tienda">Ver la tienda <ArrowUpRight size={16} /></a>
            <a className={styles.storyActionGhost} href="#contacto">Hablar con un asesor <ArrowRight size={16} /></a>
          </div>
        </div>
        <aside className={styles.storyFacts} data-reveal>
          <p className={styles.storyFactsTitle}>La empresa en datos</p>
          <ul className={styles.factList}>
            {STORY_FACTS.map((fact) => {
              const Icon = fact.icon || Sparkles;
              return (
                <li key={fact.label}>
                  <span className={styles.factIcon}><Icon size={18} /></span>
                  <div><span className={styles.factLabel}>{fact.label}</span><strong>{fact.value}</strong></div>
                </li>
              );
            })}
          </ul>
        </aside>
      </section>

      <section id="mision" className={styles.missionSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Lo que nos mueve</p>
          <h2 data-split>Un propósito claro.<br /><em>Una meta compartida.</em></h2>
        </div>
        <div className={styles.missionGrid}>
          <article className={`${styles.missionCard} ${styles.missionCardMission}`} data-reveal>
            <span className={styles.missionIcon}><Target size={26} /></span>
            <p className={styles.missionKicker}>Misión</p>
            <h3>Conectar a Honduras con tecnología confiable.</h3>
            <p>{MISSION.mission}</p>
          </article>
          <article className={`${styles.missionCard} ${styles.missionCardVision}`} data-reveal>
            <span className={styles.missionIcon}><Eye size={26} /></span>
            <p className={styles.missionKicker}>Visión</p>
            <h3>Ser el aliado de telecomunicaciones más confiable del país.</h3>
            <p>{MISSION.vision}</p>
          </article>
        </div>
        <div className={styles.valuesBlock}>
          <div className={styles.valuesHead} data-reveal>
            <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Nuestros valores</p>
            <h3>Lo que guía cada decisión.</h3>
          </div>
          <div className={styles.valuesGrid}>
            {VALUES.map((value, index) => {
              const Icon = value.icon;
              return (
                <article className={styles.valueCard} key={value.title} data-reveal>
                  <span className={styles.valueIndex}>{`0${index + 1}`}</span>
                  <span className={styles.valueIcon}><Icon size={20} /></span>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="sectores" className={styles.sectorsSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> A quién servimos</p>
          <h2 data-split>Sectores que<br /><em>confían en Arconet.</em></h2>
          <p className={styles.sectionLead}>
            Desde el instalador que atiende una casa hasta el operador que despliega fibra en todo
            un departamento, acompañamos proyectos de todos los tamaños.
          </p>
        </div>
        <div className={styles.sectorsGrid}>
          {SECTORS.map((sector) => {
            const Icon = sector.icon;
            return (
              <article className={styles.sectorCard} key={sector.title} data-reveal>
                <span className={styles.sectorIcon}><Icon size={22} /></span>
                <h3>{sector.title}</h3>
                <p>{sector.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="cobertura" className={styles.coverageSection}>
        <div className={styles.coverageCopy} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Cobertura nacional</p>
          <h2 data-split>De San Pedro Sula<br /><em>para todo Honduras.</em></h2>
          <p className={styles.sectionLead}>
            Con sede en Barrio Guamilito, San Pedro Sula, y presencia en Tegucigalpa, llevamos
            nuestros productos a cada departamento del país.
          </p>
          <div className={styles.coverageHighlights}>
            <div><Globe2 size={20} /><span>Cobertura en los 18 departamentos</span></div>
            <div><Truck size={20} /><span>Despacho y coordinación de entregas</span></div>
            <div><Award size={20} /><span>Respaldo y garantía en cada pedido</span></div>
          </div>
        </div>
        <div className={styles.coveragePanel} data-reveal>
          <p className={styles.coveragePanelTitle}>Dónde llegamos</p>
          <ul className={styles.coverageList}>
            {COVERAGE.map((place) => (
              <li key={place}>{place}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="compromiso" className={styles.commitSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> Nuestro compromiso</p>
          <h2 data-split>Calidad y garantía<br /><em>en la que puedes confiar.</em></h2>
        </div>
        <div className={styles.commitGrid}>
          {COMMITMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <article className={styles.commitCard} key={item.title} data-reveal>
                <span className={styles.commitIcon}><Icon size={22} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.quoteBand}>
        <blockquote className={styles.quoteInner} data-reveal>
          <Sparkles className={styles.quoteSpark} size={22} aria-hidden="true" />
          <p>No vendemos solo equipo: ayudamos a que cada conexión funcione.</p>
          <cite>Equipo Arconet · San Pedro Sula, Honduras</cite>
        </blockquote>
      </section>

      <section id="contacto" className={styles.contactSection}>
        <div className={styles.contactInner}>
          <div className={styles.contactContent} data-reveal>
            <p className={styles.contactEyebrow}>Tu próximo proyecto empieza aquí</p>
            <h2 data-split>Hagamos que<br /><em>todo conecte.</em></h2>
            <p>Cuéntanos qué necesita tu red. Nuestro equipo puede ayudarte a encontrar el equipo y la solución correctos.</p>
            <a href="/tienda" className={styles.contactAction}>Ver productos y soluciones <ArrowUpRight size={17} /></a>
          </div>
          <div className={styles.contactVisual} data-reveal>
            <Image
              src="/neto-servicio-cliente.png"
              alt="Neto servicio al cliente"
              width={700}
              height={700}
              className={styles.contactImage}
            />
          </div>
        </div>
        <span className={styles.contactLocation}>San Pedro Sula — Honduras</span>
      </section>

      <Footer />
    </main>
  );
}
