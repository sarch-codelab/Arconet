"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Cable,
  Check,
  ChevronRight,
  Gauge,
  Layers,
  Network,
  PackageCheck,
  Radio,
  Ruler,
  Server,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Wrench,
} from "lucide-react";

const PRODUCT_ICONS = {
  "Soluciones de Preconectorizado": Cable,
  Herrajes: SlidersHorizontal,
  "Gabinetes y Racks": Network,
  "Cajas de Distribución y Emplazamiento": Boxes,
  "Soluciones activas y Accesorios FTTH": Radio,
  "Herramientas y kits": Wrench,
  Escaleras: Ruler,
  "Optical Distribution Frame - ODF": Server,
  "Instrumentos de medición óptica": Gauge,
  "Componentes pasivos": Layers,
  "Microcables y Microproductos": Cable,
};
import { findFamily, formatPrice } from "../../catalogo-data";
import { useCatalogProducts } from "../../catalogo-products";
import { useCart } from "../../../cart-context";
import styles from "./category-products.module.css";
import Footer from "../../../footer";

const NAVIGATION = [
  { href: "/catalogo#familias", label: "Soluciones" },
  { href: "/catalogo#catalogo-items", label: "Catálogo" },
  { href: "/#empresa", label: "La empresa" },
  { href: "/contacto", label: "Contacto" },
  { href: "/terminos", label: "Términos" },
];

const SUPPORT_ITEMS = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: ArrowRight, title: "Asesoría antes de comprar", text: "Revisamos tu proyecto y te recomendamos lo que sí sirve." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde esté tu instalación." },
];

export default function CategoryProducts({ slug, category = null, blocked = false }) {
  const staticFamily = findFamily(slug) || (category ? findFamily(category.slug) || findFamily(category.nombre) : null);
  const family = category
    ? {
        ...(staticFamily || {}),
        slug: category.slug || staticFamily?.slug || slug,
        category: category.nombre,
        title: category.nombre,
        badge: staticFamily?.badge || "Categoría",
        summary: category.descripcion || staticFamily?.summary || "Productos disponibles en esta categoría.",
        description:
          category.descripcion ||
          staticFamily?.description ||
          "Explora las referencias disponibles y cotiza con el equipo técnico de Arconet.",
        items: staticFamily?.items || [],
        image: category.foto || staticFamily?.image || "",
        imageAlt: category.nombre,
      }
    : staticFamily;
  const hasLine = Boolean(staticFamily && (!category || staticFamily.category === category.nombre));
  const pageRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { addItem, open: openCart, count: cartCount } = useCart();
  const { byCategory, loading: productsLoading } = useCatalogProducts();

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const updateScroll = ({ scroll = window.scrollY, limit, progress } = {}) => {
      const scrollable = Math.max(limit ?? document.documentElement.scrollHeight - window.innerHeight, 1);
      const pageProgress = typeof progress === "number" ? progress : Math.min(1, Math.max(0, scroll / scrollable));
      page.style.setProperty("--page-progress", pageProgress.toFixed(4));
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
    const targets = document.querySelectorAll(`.${styles.reveal}`);
    if (!targets.length || typeof IntersectionObserver === "undefined") return undefined;

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

  const handleAddToCart = (product) => {
    addItem(
      {
        slug: product.id,
        href: `/catalogo/producto/${product.id}`,
        title: product.nombre,
        category: product.categoria,
        index: "01",
        image: product.foto,
        presentation: product.unidad,
      },
      1
    );
  };

  if (blocked || !family) {
    return (
      <main className={styles.missing}>
        <p className={styles.eyebrow}>Catálogo Arconet</p>
        <h1>No encontramos esa categoría.</h1>
        <p>Puede que haya cambiado de nombre. Te ayudamos a encontrarla en un minuto.</p>
        <div className={styles.missingActions}>
          <Link className={styles.primaryButton} href="/catalogo">Volver al catálogo <ArrowRight size={16} /></Link>
          <Link className={styles.ghostDarkButton} href="/#contacto">Escribir al equipo <ArrowUpRight size={16} /></Link>
        </div>
      </main>
    );
  }

  const categoryProducts = byCategory[family.category] || [];
  const filteredProducts = categoryProducts.filter((product) => {
    const query = searchTerm.trim().toLocaleLowerCase("es");
    const haystack = `${product.nombre} ${product.sku} ${product.marca || ""} ${product.categoria}`.toLocaleLowerCase("es");
    return !query || haystack.includes(query);
  });

  return (
    <main className={styles.category} ref={pageRef}>
      <div className={styles.readingProgress} aria-hidden="true" />
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
        </Link>
        <nav className={styles.nav} aria-label="Navegación principal">
          {NAVIGATION.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <button
          type="button"
          className={styles.headerAction}
          onClick={openCart}
          aria-label={`Carrito de cotización, ${cartCount} ${cartCount === 1 ? "unidad" : "unidades"}`}
        >
          Cotización
          <span>
            <ShoppingCart size={15} aria-hidden="true" />
            {cartCount > 0 && <i className="cartBadge" aria-hidden="true">{cartCount > 99 ? "99+" : cartCount}</i>}
          </span>
        </button>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/catalogo">Catálogo</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span>{family.category}</span>
      </div>

      <section className={`${styles.hero} ${styles.reveal}`}>
        <div className={styles.heroVisual}>
          {family.image ? (
            <Image
              src={family.image}
              alt={family.imageAlt}
              fill
              priority
              unoptimized={String(family.image).startsWith("data:")}
              sizes="(max-width: 900px) 92vw, 50vw"
              className={styles.heroImage}
            />
          ) : (
            <div className={styles.heroGraphic} aria-hidden="true">
              <div className={styles.graphicOrbit}><i /><i /><i /></div>
              <span>ARCONET</span>
            </div>
          )}
        </div>
        <div className={styles.heroContent}>
          <span className={styles.badge}>{family.badge}</span>
          <h1>{family.category}</h1>
          <p className={styles.heroDescription}>{family.summary}</p>
          <p className={styles.heroText}>{family.description}</p>
          
          <ul className={styles.featureList}>
            {family.items.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>

          <Link className={styles.primaryButton} href={hasLine ? `/catalogo/${family.slug}` : "/catalogo#catalogo-items"}>
            {hasLine ? "Ver línea completa" : "Ver catálogo completo"} <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className={`${styles.productsSection} ${styles.reveal}`} aria-label="Productos disponibles">
        <header className={styles.productsHeader}>
          <div>
            <h2>Productos disponibles</h2>
            <p>
              {filteredProducts.length} referencia{filteredProducts.length === 1 ? "" : "s"} de {family.category} con
              precio y existencia actualizados.
            </p>
          </div>
          <label className={styles.searchBox}>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar en esta categoría"
            />
          </label>
        </header>

        {productsLoading ? (
          <div className={styles.loadingState}>
            <p>Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay productos disponibles en esta categoría.</p>
            <Link className={styles.primaryButton} href="/catalogo">Ver todo el catálogo <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <ul className={styles.productsGrid}>
            {filteredProducts.map((product, index) => {
              const stock = Number(product.stock) || 0;
              const soldOut = stock <= 0;
              const lowStock = stock > 0 && stock <= 5;
              const stockState = soldOut ? "out" : lowStock ? "low" : "ok";
              const Icon = PRODUCT_ICONS[product.categoria] || SlidersHorizontal;
              const code = String(index + 1).padStart(2, "0");
              return (
                <li key={product.id} className={styles.familyCard}>
                  <div className={`${styles.familyVisual} ${product.foto ? styles.photoVisual : styles.graphicVisual}`}>
                    {product.foto ? (
                      <Image
                        src={product.foto}
                        alt={product.nombre}
                        fill
                        unoptimized={String(product.foto).startsWith("data:")}
                        sizes="(max-width: 700px) 92vw, (max-width: 1080px) 46vw, 30vw"
                        className={styles.familyImage}
                      />
                    ) : (
                      <div className={styles.familyGraphic} aria-hidden="true">
                        <div className={styles.graphicOrbit}><i /><i /><i /></div>
                        <Icon size={58} strokeWidth={1.1} />
                        <span>AR / {product.sku}</span>
                      </div>
                    )}
                    <span className={styles.familyIndex}>{code}</span>
                    {stockState !== "ok" ? (
                      <div className={styles.familyFlags}>
                        <span className={`${styles.familyFlag} ${soldOut ? styles.flag_soldout : styles.flag_low}`}>
                          {soldOut ? "Agotado" : "Últimas unidades"}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.familyCopy}>
                    <p className={styles.familyCategory}>{product.categoria}</p>
                    <h3>{product.nombre}</h3>
                    <p className={styles.familySummary}>
                      SKU {product.sku}
                      {product.marca ? ` · ${product.marca}` : ""} · {product.unidad}
                    </p>

                    <div className={styles.familyMeta}>
                      <div className={styles.metaCell}>
                        <span className={styles.metaLabel}>Precio</span>
                        <span className={styles.metaPrice}>
                          <strong>{formatPrice(product.precio)}</strong>
                        </span>
                      </div>
                      <div className={styles.metaCell}>
                        <span className={styles.metaLabel}>Existencias</span>
                        <span className={`${styles.metaStock} ${styles[`stock_${stockState}`] || ""}`}>
                          <i aria-hidden="true" />
                          {soldOut
                            ? "Agotado"
                            : `${stock.toLocaleString("es-HN")} pzs disponibles`}
                        </span>
                      </div>
                    </div>

                    <Link className={styles.familyLink} href={`/catalogo/producto/${product.id}`}>
                      Ver detalle y cotizar <ArrowUpRight size={16} />
                    </Link>

                    <button
                      type="button"
                      className={styles.familyQuoteButton}
                      onClick={() => handleAddToCart(product)}
                      disabled={soldOut}
                      aria-label={`Añadir ${product.nombre} a la cotización`}
                    >
                      Añadir a cotización
                      <span><ShoppingCart size={15} aria-hidden="true" /></span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${styles.supportSection} ${styles.reveal}`}>
        <div className={styles.supportHeading}>
          <p className={styles.sectionEyebrow}>Soporte</p>
          <h2>¿Necesitas ayuda con tu proyecto?</h2>
        </div>
        <ul className={styles.supportList}>
          {SUPPORT_ITEMS.map(({ icon: ItemIcon, title, text }) => (
            <li key={title}>
              <ItemIcon size={18} strokeWidth={1.5} aria-hidden="true" />
              <span><strong>{title}</strong><small>{text}</small></span>
            </li>
          ))}
        </ul>
        <Link className={styles.contactAction} href="/#contacto">
          Escribir al equipo <ArrowUpRight size={17} />
        </Link>
      </section>

      <Footer />
    </main>
  );
}
