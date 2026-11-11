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
  Globe,
  Headphones,
  LayoutGrid,
  Mail,
  Menu,
  Percent,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import Footer from "../footer";
import ExploraLineas from "./explora-lineas";
import {
  BENEFITS,
  BRANDS,
  CATEGORY_CARDS,
  CHIPS,
  DEAL_CARDS,
  HERO_IMAGE,
  HERO_SLIDES,
  IDEAS,
  PRODUCTS,
  PROMISES,
  REGALO_OFERTAS,
  SOBRE_NOVEDADES,
} from "./vitrina-data";
import { coincideBusqueda, sugerirDestacados } from "./busqueda-destacados";
import { marcasDeTienda, paginaDe, productosDeTienda } from "./vitrina-paginacion";
import { useCatalogProducts } from "../tienda/catalogo-products";
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
  sparkles: Sparkles,
  star: Star,
};

export default function CatalogoExperience() {
  const [consulta, setConsulta] = useState("");
  const [chip, setChip] = useState("todas");
  const [diapositiva, setDiapositiva] = useState(0);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [cuenta, setCuenta] = useState({ estado: "cargando" });
  const [paginaProductos, setPaginaProductos] = useState(0);
  const [paginaMarcas, setPaginaMarcas] = useState(0);
  const [paginaIdeas, setPaginaIdeas] = useState(0);
  const { products: inventario, loading: cargandoInventario, error: errorInventario } = useCatalogProducts();
  const productosRef = useRef(null);
  const categoriasBotonRef = useRef(null);
  const cuentaBotonRef = useRef(null);
  const cuentaPeticionRef = useRef(0);

  const slide = HERO_SLIDES[diapositiva];

  const destacados = useMemo(() => [...PRODUCTS, ...productosDeTienda(inventario)], [inventario]);
  const marcas = useMemo(() => [...BRANDS, ...marcasDeTienda(inventario, BRANDS)], [inventario]);
  const sugerencias = useMemo(() => sugerirDestacados(destacados, consulta), [destacados, consulta]);

  const productos = useMemo(() => destacados.filter((producto) => {
    const porChip =
      chip === "todas" ||
      (chip === "ofertas" ? producto.offer : producto.category === chip);
    return porChip && coincideBusqueda(producto, consulta);
  }), [destacados, chip, consulta]);
  const productosPagina = paginaDe(productos, paginaProductos);
  const marcasPagina = paginaDe(marcas, paginaMarcas);
  const ideasPagina = paginaDe(IDEAS, paginaIdeas);

  const irAProductos = (event) => {
    event.preventDefault();
    setBusquedaAbierta(false);
    setPaginaProductos(0);
    setChip("todas");
    // Sin behavior: respeta `scroll-behavior` (y su ajuste de movimiento
    // reducido) definido en globals.css.
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const limpiarFiltros = () => {
    setPaginaProductos(0);
    setConsulta("");
    setChip("todas");
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const verOfertas = () => {
    setPaginaProductos(0);
    setConsulta("");
    setChip("ofertas");
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const elegirCategoria = (id) => {
    setPaginaProductos(0);
    setConsulta("");
    setChip(id);
    setCategoriasAbiertas(false);
    productosRef.current?.scrollIntoView({ block: "start" });
  };

  const abrirCuenta = async () => {
    if (cuentaAbierta) {
      setCuentaAbierta(false);
      return;
    }
    setCuentaAbierta(true);
    setCuenta({ estado: "cargando" });
    const peticion = ++cuentaPeticionRef.current;
    try {
      const respuesta = await fetch("/api/cliente-auth/session", { cache: "no-store" });
      if (respuesta.status === 401) {
        if (peticion === cuentaPeticionRef.current) setCuenta({ estado: "invitado" });
      } else if (respuesta.ok) {
        const sesion = await respuesta.json();
        if (peticion === cuentaPeticionRef.current) setCuenta({ estado: "activa", nombre: sesion.nombre });
      } else if (peticion === cuentaPeticionRef.current) {
        setCuenta({ estado: "error" });
      }
    } catch {
      if (peticion === cuentaPeticionRef.current) setCuenta({ estado: "error" });
    }
  };

  const cerrarSesion = async () => {
    setCuenta({ estado: "cerrando" });
    const peticion = ++cuentaPeticionRef.current;
    try {
      const respuesta = await fetch("/api/cliente-auth/logout", { method: "POST" });
      if (!respuesta.ok) throw new Error("No se pudo cerrar la sesión");
      if (peticion === cuentaPeticionRef.current) setCuenta({ estado: "invitado" });
    } catch {
      if (peticion === cuentaPeticionRef.current) setCuenta({ estado: "error-cierre" });
    }
  };

  return (
    <>
      <main className={styles.page}>
        {/* Una sola franja de herramientas del catálogo, sin un segundo logo. */}
        <div className={`${styles.chipBar} ${styles.catalogToolbar}`} data-catalog-toolbar>
          <div className={styles.chipInner}>
            <form
              className={styles.search}
              role="search"
              onSubmit={irAProductos}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setBusquedaAbierta(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && busquedaAbierta) {
                  event.currentTarget.querySelector("input")?.focus();
                  setBusquedaAbierta(false);
                }
                if (event.key === "ArrowDown" && busquedaAbierta && sugerencias.length) {
                  event.preventDefault();
                  event.currentTarget.querySelector("[data-sugerencia]")?.focus();
                }
              }}
            >
              <label className={styles.srOnly} htmlFor="buscar-catalogo">Buscar en el catálogo</label>
              <input
                id="buscar-catalogo"
                type="search"
                value={consulta}
                onFocus={() => setBusquedaAbierta(true)}
                onChange={(event) => { setPaginaProductos(0); setConsulta(event.target.value); setBusquedaAbierta(true); }}
                placeholder="Busca equipos, líneas y más..."
                autoComplete="off"
                aria-describedby="alcance-busqueda"
              />
              <span id="alcance-busqueda" className={styles.srOnly}>Busca entre los productos destacados y los disponibles en la tienda.</span>
              <button type="submit" className={styles.searchButton} aria-label="Buscar">
                <Search size={16} aria-hidden="true" />
              </button>
              {busquedaAbierta && consulta.trim() && (
                <div className={styles.searchSuggestions} aria-label="Sugerencias de productos">
                  <p>Productos destacados</p>
                  {sugerencias.length ? (
                    <ul>
                      {sugerencias.slice(0, 6).map((producto) => (
                        <li key={producto.id}>
                          <Link href={producto.href} data-sugerencia onClick={() => setBusquedaAbierta(false)}>
                            <Search size={15} aria-hidden="true" />
                            <span><strong>{producto.name}</strong><small>{producto.line}</small></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <span className={styles.noSuggestions}>Sin coincidencias entre los productos disponibles.</span>}
                </div>
              )}
            </form>

            <div
              className={styles.categoryMenuWrap}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setCategoriasAbiertas(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && categoriasAbiertas) {
                  setCategoriasAbiertas(false);
                  categoriasBotonRef.current?.focus();
                }
              }}
            >
              <button ref={categoriasBotonRef} type="button" className={styles.categoryMenuButton} aria-expanded={categoriasAbiertas} aria-controls={categoriasAbiertas ? "menu-categorias-catalogo" : undefined} onClick={() => setCategoriasAbiertas((valor) => !valor)}>
                <Menu size={16} aria-hidden="true" /> Categorías <ChevronRight size={14} aria-hidden="true" />
              </button>
              {categoriasAbiertas && (
                <div id="menu-categorias-catalogo" className={styles.categoryMenu}>
                  <strong>Filtrar productos destacados</strong>
                  {CHIPS.map((item) => {
                    const Icono = ICONOS[item.icon];
                    return <button key={item.id} type="button" onClick={() => elegirCategoria(item.id)} aria-pressed={chip === item.id}>
                      <Icono size={16} aria-hidden="true" /> {item.label}
                    </button>;
                  })}
                </div>
              )}
            </div>
            <div
              className={styles.headerActions}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setCuentaAbierta(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && cuentaAbierta) {
                  setCuentaAbierta(false);
                  cuentaBotonRef.current?.focus();
                }
              }}
            >
              <button ref={cuentaBotonRef} type="button" className={styles.iconButton} aria-label="Acceder a mi cuenta" aria-expanded={cuentaAbierta} aria-controls={cuentaAbierta ? "menu-cuenta-catalogo" : undefined} onClick={abrirCuenta}>
                <UserRound size={18} aria-hidden="true" />
              </button>
              {cuentaAbierta && (
                <div id="menu-cuenta-catalogo" className={styles.accountMenu}>
                  <strong>Mi cuenta</strong>
                  {(cuenta.estado === "cargando" || cuenta.estado === "cerrando") && <p role="status">{cuenta.estado === "cerrando" ? "Cerrando sesión…" : "Consultando cuenta…"}</p>}
                  {cuenta.estado === "activa" && <p>Hola, {cuenta.nombre}</p>}
                  {cuenta.estado === "invitado" && <p>Accede para gestionar tus solicitudes.</p>}
                  {cuenta.estado === "error" && <p role="alert">No se pudo consultar tu cuenta. Inténtalo de nuevo.</p>}
                  {cuenta.estado === "error-cierre" && <p role="alert">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
                  {cuenta.estado === "invitado" && <><Link href="/login">Iniciar sesión</Link><Link href="/registro">Crear cuenta</Link></>}
                  {cuenta.estado === "activa" && <><Link href="/cliente">Ir a mi cuenta</Link><button type="button" onClick={cerrarSesion}>Cerrar sesión</button></>}
                  {cuenta.estado === "error" && <Link href="/cliente">Ir a mi cuenta</Link>}
                  {cuenta.estado === "error-cierre" && <><Link href="/cliente">Ir a mi cuenta</Link><button type="button" onClick={cerrarSesion}>Reintentar cierre de sesión</button></>}
                </div>
              )}
            </div>
            <div className={styles.locale} aria-label="Idioma español, Honduras, Lempiras">
              <Globe size={14} aria-hidden="true" />
              <span>ES</span>
              <i className={styles.localeSep}>|</i>
              <span>HN</span>
              <i className={styles.localeSep}>|</i>
              <span>L</span>
            </div>
          </div>
        </div>

        {/* Cada destacado tiene su imagen con panel azul en diagonal; el texto
            va en HTML para que sea seleccionable y traducible. */}
        <section className={styles.hero} aria-label="Destacados del catálogo">
          <Image
            src={slide.image || HERO_IMAGE}
            alt={slide.imageAlt}
            fill
            priority={diapositiva === 0}
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

        {/* Cuadrícula de categorías: foto de fondo con tinte y etiqueta, como
            el "Featured Category Grid" de la referencia. */}
        <section className={styles.categoryRow} aria-label="Líneas de producto">
          {CATEGORY_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`${styles.categoryCard}${card.featured ? ` ${styles.dealsCard}` : ""}`}
              style={{ "--category-tint": card.tint }}
            >
              <Image
                src={card.image}
                alt=""
                fill
                sizes="(max-width: 620px) 45vw, (max-width: 1180px) 30vw, 16vw"
                className={styles.categoryImg}
              />
              <span className={styles.categoryTint} aria-hidden="true" />
              <span className={styles.categoryShade} aria-hidden="true" />
              <span className={styles.categoryLabel}>{card.title}</span>
            </Link>
          ))}
        </section>

        {/* Productos destacados en páginas de hasta seis, con buscador y filtros. */}
        <section className={styles.section} id="destacados" ref={productosRef}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Lo más buscado</span>
              <h2 className={styles.sectionTitle}>Productos destacados</h2>
            </div>
            <div className={styles.sectionActions}>
              <Link href="/catalogo/destacados" className={styles.viewAll}>
                Ver todo <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <div className={styles.rowArrows}>
                <button
                  type="button"
                  aria-label="Productos anteriores"
                  aria-controls={productos.length ? "productos-pagina" : undefined}
                  disabled={productosPagina.actual === 0}
                  onClick={() => setPaginaProductos(productosPagina.actual - 1)}
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Productos siguientes"
                  aria-controls={productos.length ? "productos-pagina" : undefined}
                  disabled={productosPagina.actual >= productosPagina.totalPaginas - 1}
                  onClick={() => setPaginaProductos(productosPagina.actual + 1)}
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
                <span className={styles.srOnly} role="status">Página {productosPagina.actual + 1} de {productosPagina.totalPaginas}</span>
              </div>
            </div>
          </div>

          {productos.length > 0 ? (
            <div className={styles.productRow} id="productos-pagina">
              {productosPagina.elementos.map((producto) => (
                <article key={producto.id} className={styles.productCard}>
                  <Link href={producto.href} className={styles.productMedia} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={producto.image}
                      alt=""
                      fill
                      unoptimized={producto.image.startsWith("https://") || producto.image.startsWith("/api/foto-catalogo/")}
                      sizes="(max-width: 620px) 46vw, (max-width: 900px) 31vw, 16vw"
                      className={styles.productImg}
                      draggable={false}
                    />
                    <Image
                      src="/catalogo-vitrina/medalla-destacado.png"
                      alt=""
                      width={237}
                      height={348}
                      className={styles.featuredMedal}
                      draggable={false}
                    />
                    {producto.offer && <span className={styles.offerTag}>Oferta</span>}
                  </Link>
                  <div className={styles.productBody}>
                    <Link href={producto.href} className={styles.productName}>{producto.name}</Link>
                    <span className={styles.productLine}>{producto.origen === "tienda" ? "Tienda · " : ""}{producto.line}</span>
                  </div>
                </article>
              ))}
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

        {/* Fabricantes en grupos de seis, justo debajo de productos. */}
        <section className={styles.brandShowcase} id="marcas" aria-label="Fabricantes que distribuimos">
          <div className={styles.brandHead}>
            <h2 className={styles.brandTitle}>Marcas que distribuimos</h2>
            <div className={styles.brandArrows}>
              <button
                type="button"
                aria-label="Fabricantes anteriores"
                aria-controls="marcas-pagina"
                disabled={marcasPagina.actual === 0}
                onClick={() => setPaginaMarcas(marcasPagina.actual - 1)}
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Fabricantes siguientes"
                aria-controls="marcas-pagina"
                disabled={marcasPagina.actual >= marcasPagina.totalPaginas - 1}
                onClick={() => setPaginaMarcas(marcasPagina.actual + 1)}
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>
              <span className={styles.srOnly} role="status">Página {marcasPagina.actual + 1} de {marcasPagina.totalPaginas}</span>
            </div>
          </div>
          {/* Se muestran hasta seis fabricantes por página; solo cambian con las flechas. */}
          <div className={styles.brandRow} id="marcas-pagina">
            {marcasPagina.elementos.map((marca) => (
              <Link
                key={marca.name}
                href={marca.href}
                className={styles.brandCard}
                aria-label={`Ver equipos de ${marca.name} en la tienda`}
              >
                {/* Las marcas sin logotipo usan su nombre como distintivo. */}
                {marca.logo ? (
                  <Image
                    src={marca.logo}
                    alt=""
                    width={240}
                    height={80}
                    unoptimized
                    loading="eager"
                    draggable={false}
                    className={styles.brandLogo}
                  />
                ) : (
                  <span className={styles.brandWordmark}>{marca.name}</span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <ExploraLineas productos={destacados} loading={cargandoInventario} error={errorInventario} />

        {/* Ofertas y líneas destacadas. */}
        <section className={`${styles.section} ${styles.dealShowcase}`} aria-labelledby="titulo-ofertas-destacadas">
          <div className={styles.dealHead}>
            <div>
              <span className={styles.sectionEyebrow}>Descubre más</span>
              <h2 className={styles.sectionTitle} id="titulo-ofertas-destacadas">Ofertas y destacados</h2>
            </div>
            <button type="button" className={styles.viewAll} onClick={verOfertas}>
              Ver ofertas <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.dealGrid}>
            {DEAL_CARDS.map((item) => {
              const Icono = ICONOS[item.icon];
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`${styles.dealTile}${item.accent ? ` ${styles.dealTileAccent}` : ""}${item.featured ? ` ${styles.dealTileFeatured}` : ""}`}
                >
                  <span className={styles.dealTileCopy}>
                    <strong>{item.title}</strong>
                    <small>{item.detail} <ArrowUpRight size={13} aria-hidden="true" /></small>
                  </span>
                  {item.image ? (
                    <Image src={item.image} alt="" width={520} height={520} sizes="(max-width: 900px) 45vw, 20vw" className={styles.dealTileImage} />
                  ) : (
                    <span className={styles.dealTileIcon} aria-hidden="true"><Icono size={44} strokeWidth={1.5} /></span>
                  )}
                </Link>
              );
            })}
          </div>
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

        {/* Ideas / inspiración en páginas de hasta seis. */}
        <section className={styles.section} id="ideas">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Inspírate</span>
              <h2 className={styles.sectionTitle}>Ideas para tu próxima instalación</h2>
            </div>
            <div className={styles.sectionActions}>
              <Link href="/tienda" className={styles.viewAll}>
                Ver más ideas <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <div className={styles.rowArrows}>
                <button
                  type="button"
                  aria-label="Ideas anteriores"
                aria-controls="ideas-pagina"
                  disabled={ideasPagina.actual === 0}
                  onClick={() => setPaginaIdeas(ideasPagina.actual - 1)}
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Ideas siguientes"
                aria-controls="ideas-pagina"
                  disabled={ideasPagina.actual >= ideasPagina.totalPaginas - 1}
                  onClick={() => setPaginaIdeas(ideasPagina.actual + 1)}
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
                <span className={styles.srOnly} role="status">Página {ideasPagina.actual + 1} de {ideasPagina.totalPaginas}</span>
              </div>
            </div>
          </div>
          <div className={styles.ideaRow} id="ideas-pagina">
            {ideasPagina.elementos.map((idea) => (
              <Link key={idea.title} href={idea.href} className={styles.ideaCard}>
                <Image
                  src={idea.image}
                  alt=""
                  fill
                  sizes="(max-width: 620px) 46vw, (max-width: 900px) 31vw, 16vw"
                  className={styles.ideaImg}
                  draggable={false}
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
            <span className={styles.giftIcon} aria-hidden="true">
              <Image
                src={REGALO_OFERTAS}
                alt=""
                width={120}
                height={120}
                sizes="80px"
                className={styles.giftImg}
              />
            </span>
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
            <span className={styles.envelope} aria-hidden="true">
              <Image src={SOBRE_NOVEDADES} alt="" fill sizes="160px" className={styles.envelopeImg} />
            </span>
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
