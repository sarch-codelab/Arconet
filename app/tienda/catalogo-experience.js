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
import { initialFolderPalette, readFolderImagePalette } from "@/lib/folder-palette";
import VideoFondoCTA from "../video-fondo-cta";

import { FAMILIES, findFamily } from "./catalogo-data";
import { useCart } from "../cart-context";
import Footer from "../footer";
import MobileSiteMenu from "../mobile-site-menu";
import NavDock from "../nav-dock";
import { STORE_NAVIGATION } from "../navigation-data";

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


const DETAILS = [
  { icon: MapPin, title: "San Pedro Sula, Cortés", text: "Atendemos proyectos en todo Honduras." },
  { icon: Handshake, title: "Hablas con el equipo técnico", text: "No hay bots de por medio." },
  { icon: ShieldCheck, title: "Soporte antes y después", text: "Te acompañamos también en la instalación." },
];

// Ilustración de cada línea de producto. Se generaron en el mismo estilo
// (objeto 3D glossy sobre degradado pastel) para que la rejilla de la tienda
// se lea como un conjunto y no como fotos sueltas de distinta procedencia.
const LINE_ART = {
  "soluciones-de-preconectorizado": "/catalogo/lineas/cards/preconectorizado.webp",
  herrajes: "/catalogo/lineas/cards/herrajes.webp",
  "gabinetes-y-racks": "/catalogo/lineas/cards/gabinetes.webp",
  "cajas-de-distribucion-y-emplazamiento": "/catalogo/lineas/cards/cajas.webp",
  "soluciones-activas-y-accesorios-ftth": "/catalogo/lineas/cards/activas.webp",
  "herramientas-y-kits": "/catalogo/lineas/cards/herramientas.webp",
  escaleras: "/catalogo/lineas/cards/escaleras.webp",
  "optical-distribution-frame-odf": "/catalogo/lineas/cards/odf.webp",
  "instrumentos-de-medicion-optica": "/catalogo/lineas/cards/medicion.webp",
  "componentes-pasivos": "/catalogo/lineas/cards/pasivos.webp",
  // Provisional: el generador de imágenes agotó su cupo este turno. Se
  // reutiliza la de preconectorizado (también es fibra) hasta generar la propia.
  "microcables-y-microproductos": "/catalogo/lineas/cards/preconectorizado.webp",
};

const FALLBACK_CATEGORIES = FAMILIES.map((family) => ({
  id: family.id,
  nombre: family.title,
  slug: family.slug,
  descripcion: family.summary,
  foto: family.image,
  orden: Number(family.index) || 0,
  estado: "activo",
}));

export default function CatalogoExperience({ categoriasIniciales = [] }) {
  const [activeSection, setActiveSection] = useState("");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [branch, setBranch] = useState("");
  const [folderPalettes, setFolderPalettes] = useState({});
  // La "puerta" de sucursal se muestra solo si el visitante ya eligio una antes
  // (primera visita entra directo al catalog: no bloquea la compra ni genera
  // scroll lateral por el overlay).
  const [gateOpen, setGateOpen] = useState(false);
  const heroRef = useRef(null);
  const topbarRef = useRef(null);
  const scrolledPastHeroRef = useRef(false);
  const { count: cartCount, open: openCart } = useCart();
  // Llegan del servidor ya resueltas. Solo si la base no devolvió nada (por
  // ejemplo, sin conexión) se cae al catálogo estático del código.
  const catalogCategories = useMemo(
    () => (categoriasIniciales.length ? categoriasIniciales : FALLBACK_CATEGORIES),
    [categoriasIniciales]
  );

  const examples = useMemo(
    () =>
      catalogCategories.map((category) => {
        const family = findFamily(category.slug) || findFamily(category.nombre);
        // Prioridad de la imagen de la tarjeta:
        //   1. Lo que se subió desde el panel (data URL o archivo /media/), así que
        //      se distingue de las rutas del proyecto sin campos extra: si la
        //      categoría pasó por el panel, esa foto manda sobre la ilustración.
        //   2. La ilustración 3D de la línea.
        //   3. La foto de la categoría (rutas del seed).
        // Antes la ilustración iba primero, así que cambiar la foto en el panel
        // no tenía ningún efecto sobre la tarjeta.
        const subida = typeof category.foto === "string" && (
          category.foto.startsWith("data:") || category.foto.startsWith("/media/")
        );
        const foto = subida ? category.foto : "";

        return {
          title: category.nombre,
          text: category.descripcion || family?.summary || "Explora esta línea.",
          slug: category.slug,
          image:
            foto ||
            LINE_ART[category.slug] ||
            category.foto ||
            family?.image ||
            "/catalogo/hero-fiber.jpg",
        };
      }),
    [catalogCategories]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let stored = "";
      try {
        stored = window.localStorage.getItem(BRANCH_KEY) || "";
      } catch {
        stored = "";
      }
      if (BRANCHES.some((item) => item.id === stored)) {
        setBranch(stored);
      }
    });
    return () => window.cancelAnimationFrame(frame);
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
    const hero = heroRef.current;
    let viewportHeight = window.innerHeight;
    let scrollable = 1;
    let heroRange = 1;

    // Medir fuera del callback evita leer scrollHeight/offsetHeight en cada
    // frame. Esas lecturas, mezcladas con escrituras de estilo, obligaban al
    // navegador a recalcular el layout durante todo el desplazamiento.
    const measure = () => {
      viewportHeight = window.innerHeight;
      scrollable = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);
      heroRange = Math.max((hero?.offsetHeight || viewportHeight) * 0.8, 1);
    };

    const update = ({ scroll = window.scrollY, limit } = {}) => {
      if (Number.isFinite(limit) && limit > 0) scrollable = Math.max(limit, 1);

      const shouldShow = scroll > viewportHeight * 0.7;
      if (shouldShow !== scrolledPastHeroRef.current) {
        scrolledPastHeroRef.current = shouldShow;
        setScrolledPastHero(shouldShow);
      }

      if (topbar) {
        topbar.style.setProperty("--scroll-progress", Math.min(1, Math.max(0, scroll / scrollable)).toFixed(4));
      }

      if (hero) {
        hero.style.setProperty("--hero-progress", Math.min(1, Math.max(0, scroll / heroRange)).toFixed(4));
      }
    };

    const handleResize = () => {
      measure();
      update({ scroll: window.scrollY });
    };

    measure();
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

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);
    resizeObserver?.observe(document.documentElement);
    if (hero) resizeObserver?.observe(hero);
    window.addEventListener("resize", handleResize);
    update({ scroll: window.scrollY });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      locomotive.destroy();
    };
  }, [gateOpen]);

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
              <Image
              src="/arconet.png"
              alt="Arconet"
              width={1200}
              height={200}
              sizes="(max-width: 1040px) 114px, 176px"
              priority
            />
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
      <NavDock
        variant="scroll"
        visible={scrolledPastHero}
        activeId={activeSection === "familias" ? "soluciones" : activeSection}
        navigation={STORE_NAVIGATION}
        topbarRef={topbarRef}
        cartAction={
          <button
            type="button"
            className={styles.headerAction}
            onClick={openCart}
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "unidad" : "unidades"}`}
          >
            <span className={styles.headerCartLabel}>Carrito</span>
            <span className={styles.headerCartIcon}>
              <ShoppingCart size={15} aria-hidden="true" />
              {cartCount > 0 && <i className={styles.cartBadge} aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</i>}
            </span>
          </button>
        }
      />

      <div className={styles.heroFrame}>
        <section className={styles.heroCard} ref={heroRef}>
          <div className={styles.heroBackground}>
            <Image
              src="/catalogo/ingeniero-caso-panoramica.webp"
              alt="Ingeniero de telecomunicaciones de Arconet"
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
              data-scroll
              data-scroll-speed="0.04"
            />
            <div className={styles.heroOverlay} />
          </div>

          <header className={styles.heroHeader}>
            <Link className={styles.heroBrand} href="/" aria-label="Arconet, inicio">
              <Image
              src="/arconet.png"
              alt="Arconet"
              width={1200}
              height={200}
              sizes="(max-width: 1040px) 114px, 176px"
              priority
            />
            </Link>
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
                aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "unidad" : "unidades"}`}
              >
                <span className={styles.contactLabel}>Carrito</span>
                <span className={styles.contactIcon}>
                  <ShoppingCart size={14} aria-hidden="true" />
                  {cartCount > 0 && <i className={styles.cartBadge} aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</i>}
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
              <Link className={styles.ghostButton} href="/#contacto">
                Pedir asesoría <ArrowRight size={15} />
              </Link>
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
      <section id="catalogo-items" className={styles.exampleSection} aria-label="Tienda">
        <div className={styles.exampleHeading} data-reveal>
          <div>
            <p className={styles.sectionEyebrow}><i /> Catálogo</p>
            <h2>Líneas de producto<span className={styles.headingDot}>.</span></h2>
          </div>
          <p className={styles.exampleIntro}>
            Cada proyecto empieza con el equipo adecuado. Encuentra tu especialidad y explora las soluciones que tenemos para tu red.
          </p>
        </div>
        <div className={styles.exampleDirectory}>
          <span>Explora por especialidad</span>
          <span className={styles.exampleCount}><i aria-hidden="true" />{examples.length} líneas disponibles</span>
        </div>
        <div className={styles.exampleGrid}>
          {examples.map((example, index) => (
            <Link
              className={styles.exampleCard}
              href={`/tienda/categoria/${example.slug}`}
              key={example.slug}
              style={folderPalettes[example.slug] || initialFolderPalette(example.image)}
              /* Evitar precargar todas las páginas dinámicas de la rejilla. */
              prefetch={false}
            >
              <div className={styles.folderTab}>
                <span className={styles.exampleIndex} aria-hidden="true">LÍNEA {String(index + 1).padStart(2, "0")}</span>
                <h3>{example.title}</h3>
              </div>
              <div className={styles.exampleVisual}>
                <Image
                  src={example.image}
                  alt={`${example.title} de Arconet`}
                  width={1200}
                  height={800}
                  unoptimized={String(example.image).startsWith("data:")}
                  sizes="(max-width: 620px) 92vw, (max-width: 1024px) 44vw, 28vw"
                  className={styles.exampleImage}
                  onLoad={(event) => {
                    const palette = readFolderImagePalette(event.currentTarget);
                    if (palette) setFolderPalettes((current) => {
                      const previous = current[example.slug] || initialFolderPalette(example.image);
                      return JSON.stringify(previous) === JSON.stringify(palette) ? current : { ...current, [example.slug]: palette };
                    });
                  }}
                />
              </div>
              <div className={styles.exampleCopy}>
                <p>{example.text}</p>
                <div className={styles.exampleCardFooter}>
                  <span>Explorar línea</span>
                  <span className={styles.exampleArrow} aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.6} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* La sección "Acompañamiento" (intro + foto de Neto + los tres pasos) se
          retiró a petición: el mensaje de respaldo vive ahora solo en esta
          banda de detalles, que era su cierre. */}
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
        <VideoFondoCTA />
        <div className={styles.contactInner}>
          <div className={styles.contactContent} data-reveal>
            <p className={styles.contactEyebrow}>Tu proyecto empieza con una conversación</p>
            <h2>Hagamos que<br /><em>todo conecte.</em></h2>
            <p>
              Dinos qué necesitas conectar. Te respondemos con una recomendación concreta y una cotización clara, sin compromiso.
            </p>
            <Link className={styles.contactAction} href="/#contacto">
              Escribir al equipo <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <Footer />
      </div>
    </main>
  );
}
