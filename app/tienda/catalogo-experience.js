"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Handshake,
  MapPin,
  Network,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import styles from "./catalogo-experience.module.css";

import { FAMILIES, findFamily } from "./catalogo-data";
import { useCart } from "../cart-context";
import { useCategorias } from "./categorias-store";
import Footer from "../footer";
import MobileSiteMenu from "../mobile-site-menu";

const NAVIGATION = [
  { id: "inicio", label: "Inicio", mega: false, href: "/" },
  { id: "familias", label: "Soluciones", mega: true, href: "#familias", megaGroups: [
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
      { label: "Términos de uso", href: "/terminos" }
    ]}
  ]},
  { id: "empresa", label: "La empresa", mega: false, href: "/#empresa" },
  { id: "contacto", label: "Contacto", mega: false, href: "/contacto" },
];

const TRUST = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: Handshake, title: "Asesoría de una persona", text: "Alguien revisa tu proyecto contigo." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde estés." },
];

const BRANCH_KEY = "arconet-branch";

const BRANCHES = [
  { id: "sps", label: "San Pedro Sula" },
  { id: "la-ceiba", label: "La Ceiba" },
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

const FALLBACK_CATEGORIES = FAMILIES.map((family) => ({
  id: family.id,
  nombre: family.title,
  slug: family.slug,
  descripcion: family.summary,
  foto: family.image,
  orden: Number(family.index) || 0,
  estado: "activo",
}));

export default function CatalogoExperience() {
  const [activeSection, setActiveSection] = useState("");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branch, setBranch] = useState("");
  // La "puerta" de sucursal se muestra solo si el visitante ya eligio una antes
  // (primera visita entra directo al catalog: no bloquea la compra ni genera
  // scroll lateral por el overlay).
  const [gateOpen, setGateOpen] = useState(false);
  const heroRef = useRef(null);
  const navRef = useRef(null);
  const topbarRef = useRef(null);
  const { count: cartCount, open: openCart } = useCart();
  const { categorias: remoteCategories, loaded: categoriesLoaded } = useCategorias();

  const catalogCategories = useMemo(
    () => (categoriesLoaded ? remoteCategories : FALLBACK_CATEGORIES),
    [categoriesLoaded, remoteCategories]
  );

  const examples = useMemo(
    () =>
      catalogCategories.map((category) => {
        const family = findFamily(category.slug) || findFamily(category.nombre);
        return {
          title: category.nombre,
          text: category.descripcion || family?.summary || "Explora esta categoría.",
          slug: category.slug,
          image: category.foto || family?.image || "/catalogo/hero-fiber.jpg",
        };
      }),
    [catalogCategories]
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let stored = "";
    try {
      stored = window.localStorage.getItem(BRANCH_KEY) || "";
    } catch {
      stored = "";
    }
    if (BRANCHES.some((item) => item.id === stored)) {
      setBranch(stored);
    }
  }, []);

  useEffect(() => {
    if (!gateOpen) return undefined;
    const root = document.documentElement;
    const body = document.body;
    const previousRoot = root.style.overflow;
    const previousBody = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRoot;
      body.style.overflow = previousBody;
    };
  }, [gateOpen]);

  const chooseBranch = (item) => {
    try {
      window.localStorage.setItem(BRANCH_KEY, item.id);
    } catch {
      /* almacenamiento no disponible */
    }
    window.dispatchEvent(
      new CustomEvent("arconet:transition", {
        detail: {
          message: `Bienvenido a ${item.label}`,
          hold: 1000,
          onCovered: () => {
            setBranch(item.id);
            setGateOpen(false);
          },
        },
      })
    );
  };

  useEffect(() => {
    if (gateOpen) return undefined;

    const topbar = topbarRef.current;

    const update = ({ scroll = window.scrollY } = {}) => {
      const shouldShow = scroll > window.innerHeight * 0.7;
      setScrolledPastHero((current) => current === shouldShow ? current : shouldShow);

      if (topbar) {
        const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        topbar.style.setProperty("--scroll-progress", Math.min(1, Math.max(0, scroll / scrollable)).toFixed(4));
      }

      const hero = heroRef.current;
      if (hero) {
        const range = Math.max(hero.offsetHeight * 0.8, 1);
        hero.style.setProperty("--hero-progress", Math.min(1, Math.max(0, scroll / range)).toFixed(4));
      }
    };

    const locomotive = new LocomotiveScroll({
      lenisOptions: {
        anchors: true,
        gestureOrientation: "vertical",
        lerp: 0.085,
        respectReducedMotion: true,
        smoothTouch: false,
        smoothWheel: true,
      },
      scrollCallback: update,
    });

    update({ scroll: window.scrollY });
    return () => locomotive.destroy();
  }, [gateOpen]);

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
  }, [activeSection, mobileMenuOpen, scrolledPastHero]);

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

  const megaItems = NAVIGATION.filter((item) => item.mega);
  const megaMenu = megaItems.length > 0 ? (
    <div className={styles.megaMenuCatalogo}>
      {megaItems.map((item) => (
        <div key={item.id} className={styles.megaMenuCategoryCatalogo}>
          <h4>{item.label}</h4>
          <ul>
            {item.megaGroups.map((group) => (
              <li key={group.title}>
                <strong>{group.title}</strong>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className={styles.megaMenuFooter}>
        <span>Compra por sucursal con asesoría técnica directa</span>
        <a href="#familias">
          Ver soluciones
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  ) : null;

  const branchLabel = (BRANCHES.find((item) => item.id === branch) || BRANCHES[0]).label;

  return (
    <main className={styles.catalog}>
      {gateOpen ? (
        <section
          className={styles.branchGate}
          role="dialog"
          aria-modal="true"
          aria-label="Selecciona tu sucursal"
        >
          <div className={styles.branchGateMedia} aria-hidden="true">
            <Image
              src="/catalogo/bodeg.avifa.avif"
              alt=""
              fill
              priority
              sizes="100vw"
              className={styles.branchGateImage}
            />
            <span className={styles.branchGateScrim} />
            <span className={styles.branchGateGrid} />
          </div>

          <header className={styles.branchGateHeader}>
            <span className={styles.branchGateBrand}>
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
            </span>
            <span className={styles.branchGateMeta}>Catálogo técnico · Honduras</span>
          </header>

          <div className={styles.branchGateContent}>
            <p className={styles.branchGateEyebrow}><i /> Bienvenido</p>
            <h1>
              Necesitamos saber<br />
              <em>a qué sucursal</em> te diriges.
            </h1>
            <p className={styles.branchGateText}>
              Elige la sucursal más cercana para ver el catálogo de tu zona. La recordaremos para tu próxima visita.
            </p>

            <div className={styles.branchGateOptions}>
              {BRANCHES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.branchOption}
                  onClick={() => chooseBranch(item)}
                >
                  <span className={styles.branchOptionIcon}>
                    <MapPin size={18} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span className={styles.branchOptionCopy}>
                    <span>Sucursal</span>
                    <strong>{item.label}</strong>
                  </span>
                  <span className={styles.branchOptionArrow}>
                    <ArrowRight size={17} aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <footer className={styles.branchGateFooter}>
            <span className={styles.branchGateDot} />
            <span>Selecciona una sucursal para continuar</span>
          </footer>
        </section>
      ) : null}

      <div aria-hidden={gateOpen} inert={gateOpen}>
      <header
        ref={topbarRef}
        className={`${styles.topbar} ${scrolledPastHero ? styles.topbarVisible : styles.topbarHidden}`}
        aria-hidden={!scrolledPastHero}
      >
        <span className={styles.scrollProgress} aria-hidden="true">
          <i />
        </span>

        <div className={styles.topbarShell}>
          <a className={styles.topbarBrand} href="/" aria-label="Arconet, inicio" tabIndex={scrolledPastHero ? 0 : -1}>
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
          </a>

          <nav className={styles.topbarNav} aria-label="Navegación del catálogo" ref={navRef}>
            <span className={styles.navIndicator} aria-hidden="true" />
            {NAVIGATION.map((item) => {
              const isActive = Boolean(item.id) && activeSection === item.id;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  data-active={isActive ? "true" : "false"}
                  className={`${isActive ? styles.topbarNavActive : ""}${item.mega ? ` ${styles.megaTrigger}` : ""}`}
                  aria-current={isActive ? "location" : undefined}
                  tabIndex={scrolledPastHero ? 0 : -1}
                >
                  {item.label}
                </a>
              );
            })}
            <button
              type="button"
              className={`${styles.menuToggleCatalogo}${mobileMenuOpen ? ` ${styles.menuToggleActiveCatalogo}` : ""}`}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              tabIndex={scrolledPastHero ? 0 : -1}
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>
          </nav>

          <button
            type="button"
            className={styles.topbarAction}
            onClick={openCart}
            tabIndex={scrolledPastHero ? 0 : -1}
            aria-label={`Carrito de cotización, ${cartCount} ${cartCount === 1 ? "unidad" : "unidades"}`}
          >
            <span className={styles.topbarCartIcon}>
              <ShoppingCart size={15} aria-hidden="true" />
              {cartCount > 0 && <i className="cartBadge" aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</i>}
            </span>
            Cotización
          </button>

          {megaMenu}
          {mobileMenuOpen && (
            <div className={styles.mobileMenu}>
              {NAVIGATION.map((item) =>
                item.mega ? (
                  <div key={item.label}>
                    <a href={item.href} onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
                    {item.megaGroups.map((group) => (
                      <div key={group.title}>
                        <strong>{group.title}</strong>
                        {group.links.map((link) => (
                          <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}>{link.label}</a>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
                )
              )}
              <div className={styles.mobileMenuLegal}>
                <Link href="/terminos" onClick={() => setMobileMenuOpen(false)}>Términos</Link>
                <Link href="/privacidad" onClick={() => setMobileMenuOpen(false)}>Privacidad</Link>
                <Link href="/ayuda" onClick={() => setMobileMenuOpen(false)}>Ayuda</Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className={styles.heroFrame}>
        <section className={styles.heroCard} ref={heroRef}>
          <div className={styles.heroBackground}>
            <Image
              src="/catalogo/ingeniero-caso-panoramica.png"
              alt="Ingeniero de telecomunicaciones de Arconet"
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
                <a
                  className={`${item.id && activeSection === item.id ? styles.navigationActive : ""}${item.mega ? ` ${styles.megaTrigger}` : ""}`}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.heroActionTab}>
              <MobileSiteMenu />
              <button
                type="button"
                className={styles.contactButton}
                onClick={openCart}
                aria-label={`Carrito de cotización, ${cartCount} ${cartCount === 1 ? "unidad" : "unidades"}`}
              >
                <span className={styles.contactLabel}>Cotización</span>
                <span className={styles.contactIcon}>
                  <ShoppingCart size={14} aria-hidden="true" />
                  {cartCount > 0 && <i className="cartBadge" aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</i>}
                </span>
              </button>
            </div>
          </header>

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}><i /> Catálogo técnico · Honduras</p>
            <h1>Todo para tu red,<br />y <em>quién te acompaña.</em></h1>
            <p className={styles.heroDescription}>
              Fibra óptica, CATV, satélite e infraestructura. Explora el catálogo y cotiza con una persona de nuestro equipo, aquí en San Pedro Sula.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#familias">
                Ver soluciones <ArrowDown size={15} />
              </a>
              <a className={styles.ghostButton} href="/#contacto">
                Pedir asesoría <ArrowRight size={15} />
              </a>
            </div>
          </div>

          <div className={styles.heroFooter}>
            <span>ARCONET · {branchLabel.toLocaleUpperCase("es")}, HONDURAS</span>
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

      {/* id="catalogo-items": el carrito y las migas de pan enlazan aquí
          (/tienda#catalogo-items). Faltaba, así que esos enlaces aterrizaban
          arriba de la página en vez de en la lista de líneas. */}
      <section id="catalogo-items" className={styles.exampleSection} aria-label="Catálogo">
        <div className={styles.exampleHeading} data-reveal>
          <p className={styles.sectionEyebrow}><i /> Catálogo</p>
          <h2>Líneas de producto</h2>
        </div>
        <div className={styles.exampleGrid}>
          {examples.map((example) => (
            <Link className={styles.exampleCard} href={`/tienda/categoria/${example.slug}`} key={example.title} data-reveal>
              <div className={styles.exampleVisual}>
                <Image
                  src={example.image}
                  alt={`${example.title} de Arconet`}
                  width={657}
                  height={601}
                  unoptimized={String(example.image).startsWith("data:")}
                  sizes="(max-width: 760px) 92vw, 30vw"
                  className={styles.exampleImage}
                />
              </div>
              <div className={styles.exampleCopy}>
                <h3>{example.title}</h3>
                <p>{example.text}</p>
                <span className={styles.exampleLink}>Ver catálogo <ArrowUpRight size={15} /></span>
              </div>
            </Link>
          ))}
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
            src="/neto-manana.png"
            alt="Neto, representante de Arconet"
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
        <div className={styles.contactInner}>
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
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <Footer />
      </div>
    </main>
  );
}
