"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Handshake,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { FAMILIES, findFamily, formatPrice } from "../catalogo-data";
import { useCatalogProducts } from "../catalogo-products";
import { useCart } from "../../cart-context";
import styles from "./product-detail.module.css";
import Footer from "../../footer";

const NAVIGATION = [
  { href: "/catalogo#familias", label: "Soluciones" },
  { href: "/catalogo#catalogo-items", label: "Catálogo" },
  { href: "/#empresa", label: "La empresa" },
  { href: "/contacto", label: "Contacto" },
  { href: "/terminos", label: "Términos" },
];

const PRESENTATIONS = ["Unidad", "Caja", "Proyecto completo"];

const TABS = [
  { id: "detalles", label: "Detalles" },
  { id: "especificaciones", label: "Especificaciones" },
  { id: "aplicaciones", label: "Aplicaciones" },
  { id: "soporte", label: "Soporte y entrega" },
];

const SUPPORT_ITEMS = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: Handshake, title: "Asesoría antes de comprar", text: "Revisamos tu proyecto y te recomendamos lo que sí sirve." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde esté tu instalación." },
  { icon: ShieldCheck, title: "Soporte después de la compra", text: "Seguimos disponibles durante la instalación." },
];

function ProductVisual({ item, className, priority = false }) {
  if (!item.src) {
    return (
      <div className={`${styles.graphic} ${className || ""}`} aria-hidden="true">
        <div className={styles.graphicOrbit}><i /><i /><i /></div>
        <span>ARCONET</span>
      </div>
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.alt}
      fill
      priority={priority}
      sizes="(max-width: 900px) 92vw, 46vw"
      className={`${styles.galleryImage} ${item.fit === "contain" ? styles.fitContain : styles.fitCover} ${className || ""}`}
    />
  );
}

export default function ProductDetail({ slug }) {
  const family = findFamily(slug);
  const pageRef = useRef(null);
  const topbarRef = useRef(null);
  const [activeTab, setActiveTab] = useState("detalles");
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [presentation, setPresentation] = useState(PRESENTATIONS[0]);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { addItem, open: openCart, count: cartCount } = useCart();
  const { byCategory, loading: productsLoading } = useCatalogProducts();

  useEffect(() => {
    const page = pageRef.current;
    const topbar = topbarRef.current;
    if (!page) return undefined;

    const updateScroll = ({ scroll = window.scrollY, limit, progress } = {}) => {
      const scrollable = Math.max(limit ?? document.documentElement.scrollHeight - window.innerHeight, 1);
      const pageProgress = typeof progress === "number" ? progress : Math.min(1, Math.max(0, scroll / scrollable));
      page.style.setProperty("--page-progress", pageProgress.toFixed(4));

      // Show topbar after scrolling past a threshold
      const shouldShow = scroll > window.innerHeight * 0.15;
      setScrolledPastHero((current) => current === shouldShow ? current : shouldShow);

      if (topbar) {
        topbar.style.setProperty("--scroll-progress", Math.min(1, Math.max(0, scroll / scrollable)).toFixed(4));
      }
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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = () => {
    if (!family) return;
    addItem(
      {
        slug: family.slug,
        href: `/catalogo/${family.slug}`,
        title: family.title,
        category: family.category,
        index: family.index,
        image: family.image,
        presentation,
      },
      quantity
    );
  };

  if (!family) {
    return (
      <main className={styles.missing}>
        <p className={styles.eyebrow}>Catálogo Arconet</p>
        <h1>No encontramos esa línea.</h1>
        <p>Puede que haya cambiado de nombre. Te ayudamos a encontrarla en un minuto.</p>
        <div className={styles.missingActions}>
          <Link className={styles.primaryButton} href="/catalogo">Volver al catálogo <ArrowRight size={16} /></Link>
          <Link className={styles.ghostDarkButton} href="/#contacto">Escribir al equipo <ArrowUpRight size={16} /></Link>
        </div>
      </main>
    );
  }

  const gallery = family.gallery || [{ src: family.image, alt: family.imageAlt, fit: "contain", caption: "Producto" }];
  const current = gallery[Math.min(activeImage, gallery.length - 1)];
  const related = FAMILIES.filter((item) => item.id !== family.id).slice(0, 3);
  const Icon = family.icon;

  return (
    <main className={styles.detail} ref={pageRef}>
      <div className={styles.readingProgress} aria-hidden="true" />

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

          <nav className={styles.topbarNav} aria-label="Navegación del catálogo">
            {NAVIGATION.map((item) => (
              <a
                key={item.label}
                href={item.href}
                tabIndex={scrolledPastHero ? 0 : -1}
              >
                {item.label}
              </a>
            ))}
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
        </div>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/catalogo">Catálogo</Link>
        <ChevronRight size={13} aria-hidden="true" />
        {family.category !== family.title && (
          <>
            <Link href="/catalogo#catalogo-items">{family.category}</Link>
            <ChevronRight size={13} aria-hidden="true" />
          </>
        )}
        <span>{family.title}</span>
      </div>

      <section className={styles.product} data-reveal>
        <div className={styles.gallery}>
          <div className={styles.thumbs} role="group" aria-label="Imágenes del producto">
            {gallery.map((item, index) => (
              <button
                type="button"
                key={`${item.src || "grafico"}-${index}`}
                className={activeImage === index ? styles.thumbActive : ""}
                aria-label={`Ver imagen ${index + 1}: ${item.caption}`}
                aria-pressed={activeImage === index}
                onClick={() => setActiveImage(index)}
              >
                {item.src ? (
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    sizes="84px"
                    className={`${styles.galleryImage} ${item.fit === "contain" ? styles.fitContain : styles.fitCover}`}
                  />
                ) : (
                  <span className={styles.thumbGraphic} aria-hidden="true"><Icon size={20} /></span>
                )}
              </button>
            ))}
          </div>

          <figure className={styles.stage}>
            <ProductVisual item={current} priority={activeImage === 0} />
            <figcaption>
              <span>{current.caption}</span>
              <span>{family.index} / {String(gallery.length).padStart(2, "0")}</span>
            </figcaption>
          </figure>
        </div>

        <div className={styles.info}>
          <span className={styles.badge}>{family.badge}</span>
          <h1>{family.title}</h1>
          <p className={styles.metaLine}>
            <Icon size={15} aria-hidden="true" /> {family.category} · Línea {family.index}
          </p>

          <p className={styles.price}>Cotización a la medida</p>
          <p className={styles.priceNote}>El precio depende del volumen y la configuración. Te respondemos el mismo día.</p>

          <p className={styles.description}>{family.summary} {family.description}</p>

          <ul className={styles.featureList}>
            {family.items.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>

          <div className={styles.configBox}>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>Presentación</span>
              <div className={styles.chips} role="group" aria-label="Elegir presentación">
                {PRESENTATIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={presentation === option ? styles.chipActive : ""}
                    aria-pressed={presentation === option}
                    onClick={() => setPresentation(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.configRow}>
              <span className={styles.configLabel}>Cantidad</span>
              <div className={styles.stepper}>
                <button type="button" aria-label="Restar una unidad" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Sumar una unidad" onClick={() => setQuantity((value) => value + 1)}>
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={handleAddToCart}>
              Agregar a cotización <span><ShoppingCart size={16} aria-hidden="true" /></span>
            </button>
            <button
              type="button"
              className={`${styles.saveButton} ${saved ? styles.saveButtonActive : ""}`}
              aria-pressed={saved}
              aria-label={saved ? `Quitar ${family.title} de guardados` : `Guardar ${family.title}`}
              onClick={() => setSaved((value) => !value)}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className={styles.trustRow}>
            {SUPPORT_ITEMS.slice(0, 3).map(({ icon: ItemIcon, title, text }) => (
              <div key={title}>
                <ItemIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span><strong>{title}</strong><small>{text}</small></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(() => {
        const products = byCategory[family.category] || [];
        if (productsLoading || products.length === 0) return null;
        return (
          <section className={styles.productsSection} data-reveal aria-label="Productos disponibles">
            <header className={styles.productsHeader}>
              <h2>Productos disponibles</h2>
              <p>
                {products.length} referencia{products.length === 1 ? "" : "s"} de {family.category} con
                precio y existencia actualizados.
              </p>
            </header>
            <ul className={styles.productsGrid}>
              {products.map((product) => (
                <li key={product.id} className={styles.productCard}>
                  <div className={styles.productCardMedia}>
                    {product.foto ? (
                      <Image
                        src={product.foto}
                        alt={product.nombre}
                        fill
                        sizes="(max-width: 700px) 90vw, 30vw"
                        className={styles.productCardImage}
                      />
                    ) : (
                      <div className={styles.productCardPlaceholder} aria-hidden="true">
                        <span>{product.nombre.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.productCardCopy}>
                    {product.marca ? <p className={styles.productCardBrand}>{product.marca}</p> : null}
                    <h3>{product.nombre}</h3>
                    <p className={styles.productCardSku}>SKU {product.sku}</p>
                    <div className={styles.productCardMeta}>
                      <strong>{formatPrice(product.precio)}</strong>
                      <span className={product.stock > 0 ? styles.productInStock : styles.productOutStock}>
                        {product.stock > 0
                          ? `${product.stock.toLocaleString("es-HN")} ${product.unidad.toLowerCase()}`
                          : "Agotado"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <section className={styles.tabSection} data-reveal>
        <div className={styles.tabs} role="tablist" aria-label="Información del producto">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? styles.tabActive : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanels}>
          <div className={styles.tabContent} role="tabpanel">
            {activeTab === "detalles" && (
              <>
                <p>{family.description}</p>
                <ul className={styles.panelList}>
                  {family.items.map((item) => (
                    <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </>
            )}

            {activeTab === "especificaciones" && (
              <dl className={styles.specList}>
                {family.specs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === "aplicaciones" && (
              <>
                <p>Estas líneas se instalan normalmente en:</p>
                <ul className={styles.panelList}>
                  {family.applications.map((application) => (
                    <li key={application}><Check size={14} aria-hidden="true" />{application}</li>
                  ))}
                </ul>
              </>
            )}

            {activeTab === "soporte" && (
              <ul className={styles.supportList}>
                {SUPPORT_ITEMS.map(({ icon: ItemIcon, title, text }) => (
                  <li key={title}>
                    <ItemIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span><strong>{title}</strong><small>{text}</small></span>
                  </li>
                ))}
              </ul>
            )}

            <p className={styles.tabNote}>Las especificaciones son de referencia; confirmamos cada detalle en la cotización.</p>
          </div>

          <figure className={styles.tabMedia}>
            <Image
              src="/catalogo/infraestructura.jpg"
              alt="Equipos de telecomunicaciones instalados"
              fill
              sizes="(max-width: 900px) 92vw, 40vw"
              className={styles.galleryImage + " " + styles.fitCover}
            />
            <figcaption>Así se ve el equipo cuando ya está trabajando.</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.relatedSection} data-reveal>
        <div className={styles.relatedHeading}>
          <div>
            <p className={styles.sectionEyebrow}><i /> También podrías necesitar</p>
            <h2>Otras líneas del catálogo</h2>
          </div>
          <Link className={styles.textLink} href="/catalogo">Ver todo el catálogo <ArrowRight size={15} /></Link>
        </div>

        <div className={styles.relatedGrid}>
          {related.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link className={styles.relatedCard} href={`/catalogo/${item.slug}`} key={item.id}>
                <div className={`${styles.relatedVisual} ${styles[item.visual]}`}>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 700px) 90vw, 30vw"
                      className={`${styles.galleryImage} ${item.visual === "photoVisual" ? styles.fitCover : styles.fitContain}`}
                    />
                  ) : (
                    <div className={styles.graphic} aria-hidden="true">
                      <div className={styles.graphicOrbit}><i /><i /><i /></div>
                      <ItemIcon size={40} strokeWidth={1.1} />
                    </div>
                  )}
                  <span className={styles.relatedIndex}>{item.index}</span>
                </div>
                <div className={styles.relatedCopy}>
                  <p>{item.category}</p>
                  <h3>{item.title}</h3>
                  <span>{item.summary}</span>
                  <em>Ver detalle <ArrowUpRight size={15} /></em>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.contactSection} data-reveal>
        <div className={styles.contactContent}>
          <p className={styles.contactEyebrow}>¿Te falta una pieza o no sabes cuál elegir?</p>
          <h2>Hagamos que<br /><em>todo conecte.</em></h2>
          <p>Cuéntanos qué necesitas conectar y te respondemos con una recomendación concreta, sin compromiso.</p>
          <Link className={styles.contactAction} href="/#contacto">
            Escribir al equipo <ArrowUpRight size={17} />
          </Link>
        </div>
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <Footer />
    </main>
  );
}
