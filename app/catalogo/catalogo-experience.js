"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Cable,
  Camera,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Gift,
  Globe,
  Headphones,
  Heart,
  LayoutGrid,
  Mail,
  Percent,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import Footer from "../footer";
import { useCart } from "../cart-context";
import {
  BENEFITS,
  CATEGORY_CARDS,
  CHIPS,
  HERO_IMAGE,
  HERO_SLIDES,
  IDEAS,
  NAV_LINKS,
  PRODUCTS,
  PROMISES,
} from "./vitrina-data";
import styles from "./catalogo-experience.module.css";

const ICONOS = {
  grid: LayoutGrid,
  cable: Cable,
  boxes: Boxes,
  gauge: Gauge,
  server: Server,
  wrench: Wrench,
  percent: Percent,
  truck: Truck,
  shield: ShieldCheck,
  rotate: RotateCcw,
  headphones: Headphones,
  badge: BadgeCheck,
  heart: Heart,
  star: Star,
};

const formatoLikes = (cantidad) =>
  cantidad >= 1000 ? `${(cantidad / 1000).toFixed(1)}k` : String(cantidad);

export default function CatalogoExperience() {
  const [consulta, setConsulta] = useState("");
  const [chip, setChip] = useState("todas");
  const [favoritos, setFavoritos] = useState(() => new Set());
  const [diapositiva, setDiapositiva] = useState(0);
  const productosRef = useRef(null);
  const { count: cartCount, open: openCart } = useCart();

  const slide = HERO_SLIDES[diapositiva];

  const productos = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    return PRODUCTS.filter((producto) => {
      const porChip =
        chip === "todas" ||
        (chip === "ofertas" ? producto.offer : producto.category === chip);
      const porTexto =
        !texto || `${producto.name} ${producto.line}`.toLowerCase().includes(texto);
      return porChip && porTexto;
    });
  }, [chip, consulta]);

  const alternarFavorito = (id) => {
    setFavoritos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const irAProductos = (event) => {
    event.preventDefault();
    // Sin behavior: respeta `scroll-behavior` (y su ajuste de movimiento
    // reducido) definido en globals.css.
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const limpiarFiltros = () => {
    setConsulta("");
    setChip("todas");
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const verFavoritos = () => {
    setChip("favoritos");
    setConsulta("");
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <>
      <main className={styles.page}>
        {/* Cabecera: logo, buscador, navegación y acciones. */}
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <Link className={styles.brand} href="/" aria-label="Arconet, ir al inicio">
              <Image
                src="/arconet.png"
                alt="Arconet"
                width={1200}
                height={200}
                className={styles.brandImg}
                sizes="132px"
                loading="eager"
                fetchPriority="low"
              />
              <span className={styles.brandTagline}>Descubre. Equipa. Conecta.</span>
            </Link>

            <form className={styles.search} role="search" onSubmit={irAProductos}>
              <label className={styles.srOnly} htmlFor="buscar-catalogo">Buscar en el catálogo</label>
              <input
                id="buscar-catalogo"
                type="search"
                value={consulta}
                onChange={(event) => setConsulta(event.target.value)}
                placeholder="Busca equipos, líneas y más..."
                autoComplete="off"
              />
              <button type="submit" className={styles.searchButton} aria-label="Buscar">
                <Search size={16} aria-hidden="true" />
              </button>
            </form>

            <nav className={styles.mainNav} aria-label="Navegación principal">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={item.href === "/catalogo" ? styles.navActive : ""}
                  aria-current={item.href === "/catalogo" ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={verFavoritos}
                aria-label={`Ver favoritos, ${favoritos.size} guardados`}
              >
                <Heart size={18} aria-hidden="true" />
                {favoritos.size > 0 && <i className={styles.miniBadge}>{favoritos.size}</i>}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={openCart}
                aria-label={`Abrir carrito, ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}
              >
                <ShoppingCart size={18} aria-hidden="true" />
                {cartCount > 0 && <i className={styles.miniBadge}>{cartCount > 99 ? "99+" : cartCount}</i>}
              </button>
              <Link className={styles.iconButton} href="/login" aria-label="Acceder a mi cuenta">
                <UserRound size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        {/* Segunda fila: chips de líneas y selector de región/moneda. */}
        <div className={styles.chipBar}>
          <div className={styles.chipInner}>
            <div className={styles.chips} role="group" aria-label="Filtrar por línea">
              {CHIPS.map((item) => {
                const Icono = ICONOS[item.icon];
                const activo = chip === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.chip}${activo ? ` ${styles.chipActive}` : ""}`}
                    aria-pressed={activo}
                    onClick={() => setChip(item.id)}
                  >
                    <Icono size={14} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.locale} aria-label="Idioma español, Honduras, Lempiras">
              <Globe size={14} aria-hidden="true" />
              <span>ES</span>
              <i className={styles.localeSep}>|</i>
              <span>HN</span>
              <i className={styles.localeSep}>|</i>
              <span>L</span>
              <Heart size={15} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Hero: la imagen ya trae el panel azul en diagonal y el cluster de
            equipos; el texto va en HTML para que sea seleccionable y traducible. */}
        <section className={styles.hero} aria-label="Destacados del catálogo">
          <Image
            src={HERO_IMAGE}
            alt="Equipos de fibra óptica, instrumentos de medición y gabinetes de Arconet"
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroVeil} aria-hidden="true" />

          <Link className={styles.heroBadge} href="/tienda">
            <strong>{slide.badge}</strong>
            <span>Ver más <ArrowUpRight size={12} aria-hidden="true" /></span>
          </Link>

          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>{slide.eyebrow}</p>
            <h1 className={styles.heroTitle}>
              {slide.title}
              <span>{slide.accent}</span>
            </h1>
            <p className={styles.heroText}>{slide.text}</p>
            <div className={styles.heroActions}>
              <Link className={styles.heroPrimary} href={slide.href}>
                {slide.cta} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className={styles.heroSecondary} href="/tienda">Explorar la tienda</Link>
            </div>
          </div>

          <div className={styles.heroFooter}>
            <span className={styles.heroShip}><b className={styles.flag}>HN</b> Enviamos a todo Honduras</span>
            <span className={styles.heroShip}><Truck size={13} aria-hidden="true" /> Entrega 24–48 h</span>
            <span className={styles.heroShip}><Headphones size={13} aria-hidden="true" /> Soporte técnico</span>
            <div className={styles.heroArrows}>
              <button
                type="button"
                aria-label="Destacado anterior"
                onClick={() => setDiapositiva((valor) => (valor - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Destacado siguiente"
                onClick={() => setDiapositiva((valor) => (valor + 1) % HERO_SLIDES.length)}
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* Tarjetas de líneas. */}
        <section className={styles.categoryRow} aria-label="Líneas de producto">
          {CATEGORY_CARDS.map((card) => (
            <Link key={card.title} href={card.href} className={styles.categoryCard}>
              <span className={styles.categoryThumb}>
                <Image src={card.image} alt="" width={120} height={120} sizes="64px" className={styles.categoryImg} />
              </span>
              <span className={styles.categoryCopy}>
                <strong>{card.title}</strong>
                <small>{card.subtitle}</small>
              </span>
              <span className={styles.categoryArrow}><ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          ))}
          <Link href="/tienda" className={`${styles.categoryCard} ${styles.dealsCard}`}>
            <span className={styles.dealsIcon}><Percent size={26} aria-hidden="true" /></span>
            <span className={styles.categoryCopy}>
              <strong>Ofertas</strong>
              <small>Precios de temporada</small>
            </span>
            <span className={styles.categoryArrow}><ArrowRight size={14} aria-hidden="true" /></span>
          </Link>
        </section>

        {/* Productos destacados con buscador y filtros reales. */}
        <section className={styles.section} id="destacados" ref={productosRef}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Lo más buscado</span>
              <h2 className={styles.sectionTitle}>Productos destacados</h2>
            </div>
            <button type="button" className={styles.viewAll} onClick={limpiarFiltros}>
              Ver todo <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          {productos.length > 0 ? (
            <div className={styles.productGrid}>
              {productos.map((producto) => {
                const gusta = favoritos.has(producto.id);
                return (
                  <article key={producto.id} className={styles.productCard}>
                    <Link href={producto.href} className={styles.productMedia} tabIndex={-1} aria-hidden="true">
                      <Image
                        src={producto.image}
                        alt=""
                        fill
                        sizes="(max-width: 620px) 45vw, (max-width: 1100px) 30vw, 16vw"
                        className={styles.productImg}
                      />
                      {producto.offer && <span className={styles.offerTag}>Oferta</span>}
                    </Link>
                    <div className={styles.productBody}>
                      <Link href={producto.href} className={styles.productName}>{producto.name}</Link>
                      <span className={styles.productLine}>{producto.line}</span>
                    </div>
                    <div className={styles.productFoot}>
                      <strong className={styles.price}>{producto.price}</strong>
                      <button
                        type="button"
                        className={`${styles.like}${gusta ? ` ${styles.likeActive}` : ""}`}
                        aria-pressed={gusta}
                        aria-label={`${gusta ? "Quitar de" : "Guardar en"} favoritos: ${producto.name}`}
                        onClick={() => alternarFavorito(producto.id)}
                      >
                        <Heart size={13} fill={gusta ? "currentColor" : "none"} aria-hidden="true" />
                        {formatoLikes(producto.likes + (gusta ? 1 : 0))}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <Search size={22} aria-hidden="true" />
              <strong>No encontramos equipos con ese filtro</strong>
              <span>Prueba otra palabra o vuelve a todas las líneas.</span>
              <button type="button" onClick={limpiarFiltros}>Ver todo el catálogo</button>
            </div>
          )}
        </section>

        {/* Ventajas. */}
        <section className={styles.benefits} aria-label="Ventajas de comprar con Arconet">
          {BENEFITS.map((item) => {
            const Icono = ICONOS[item.icon];
            return (
              <div key={item.title} className={styles.benefit}>
                <span className={styles.benefitIcon}><Icono size={22} aria-hidden="true" /></span>
                <span className={styles.benefitCopy}>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
              </div>
            );
          })}
        </section>

        {/* Ideas / inspiración. */}
        <section className={styles.section} id="ideas">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Inspírate</span>
              <h2 className={styles.sectionTitle}>Ideas para tu próxima instalación</h2>
            </div>
            <Link href="/tienda" className={styles.viewAll}>
              Ver más ideas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.ideaGrid}>
            {IDEAS.map((idea) => (
              <Link key={idea.title} href={idea.href} className={styles.ideaCard}>
                <Image
                  src={idea.image}
                  alt=""
                  fill
                  sizes="(max-width: 620px) 90vw, (max-width: 1100px) 45vw, 19vw"
                  className={styles.ideaImg}
                />
                <span className={styles.ideaShade} aria-hidden="true" />
                <span className={styles.ideaCopy}>
                  <strong>{idea.title}</strong>
                  <small>{idea.count}</small>
                </span>
                <span className={styles.ideaArrow}><ArrowUpRight size={15} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* Ofertas y boletín. */}
        <section className={styles.promoRow} aria-label="Ofertas y novedades">
          <div className={styles.dealsPromo}>
            <span className={styles.giftIcon}><Gift size={24} aria-hidden="true" /></span>
            <div className={styles.dealsCopy}>
              <h2>Ofertas exclusivas para ti</h2>
              <p>Ahorra en equipos seleccionados para tu próxima instalación.</p>
              <Link className={styles.dealsButton} href="/tienda">
                Ver ofertas <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className={styles.newsletter}>
            <div className={styles.newsletterCopy}>
              <h2>Recibe las novedades</h2>
              <p>Nuevas líneas, equipos y precios. Confírmalo con nuestro equipo.</p>
              {/* Formulario GET nativo: sin backend el correo llega a /contacto
                  como parámetro, donde la persona puede completar su solicitud. */}
              <form className={styles.newsletterForm} action="/contacto" method="get">
                <label className={styles.srOnly} htmlFor="correo-novedades">Tu correo electrónico</label>
                <input id="correo-novedades" name="correo" type="email" required placeholder="Escribe tu correo" />
                <button type="submit">Suscribirme</button>
              </form>
            </div>
            <span className={styles.envelope} aria-hidden="true"><Mail size={30} /></span>
          </div>
        </section>

        {/* Cierre compacto + footer compartido del sitio. */}
        <div className={styles.bottomStrip}>
          <div className={styles.promises}>
            {PROMISES.map((item) => {
              const Icono = ICONOS[item.icon];
              return (
                <div key={item.title} className={styles.promise}>
                  <span className={styles.promiseIcon}><Icono size={14} aria-hidden="true" /></span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <div className={styles.social}>
            <span>Síguenos</span>
            <a
              href="https://www.instagram.com/arcolab_s.a/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Arconet"
            >
              <Camera size={15} aria-hidden="true" />
            </a>
            <Link href="/contacto" aria-label="Escribir al equipo"><Mail size={15} aria-hidden="true" /></Link>
            <Link href="/ayuda" aria-label="Ayuda y preguntas frecuentes"><Sparkles size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
