"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Cable,
  Handshake,
  Minus,
  Network,
  PackageCheck,
  Plus,
  Radio,
  Satellite,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { formatPrice } from "../../catalogo-data";
import { useCatalogProducts } from "../../catalogo-products";
import { useCart } from "../../../cart-context";
import Footer from "../../../footer";
import styles from "./product-page.module.css";

const CATEGORY_ICONS = {
  "Fibra óptica": Cable,
  "CATV y satélite": Satellite,
  Infraestructura: Network,
  "Medición y señal": Radio,
  Accesorios: SlidersHorizontal,
};

const TRUST = [
  { icon: PackageCheck, label: "Importación directa" },
  { icon: Handshake, label: "Asesoría antes de comprar" },
  { icon: Truck, label: "Entrega en Honduras" },
  { icon: ShieldCheck, label: "Garantía real" },
];

export default function ProductPage({ product }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem, open: openCart, count: cartCount } = useCart();
  const { products } = useCatalogProducts();

  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const lowStock = stock > 0 && stock <= 20;
  const Icon = CATEGORY_ICONS[product.categoria] || SlidersHorizontal;
  const [activeSection, setActiveSection] = useState("familias");
  const navRef = useRef(null);
  const NAVIGATION = [
    { id: "inicio", label: "Inicio", href: "/" },
    { id: "familias", label: "Soluciones", href: "/catalogo" },
    { id: "empresa", label: "La empresa", href: "/#empresa" },
    { id: "contacto", label: "Contacto", href: "/contacto" },
  ];

  // Actualizar activeSection al hacer scroll (solo en la página principal)
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
  }, [activeSection]);

  // Indicador deslizante del menú de navegación
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
  }, [activeSection]);

  const related = products
    .filter((item) => item.categoria === product.categoria && item.id !== product.id)
    .slice(0, 3);

  const handleAddToQuote = () => {
    addItem(
      {
        slug: product.id,
        title: product.nombre,
        category: product.categoria,
        image: product.foto || "",
        presentation: product.unidad || "Unidad",
      },
      quantity
    );
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
        </Link>
        <nav className={`${styles.nav} ${styles.navigation}`} aria-label="Navegación principal" ref={navRef}>
          <span className={styles.navIndicator} aria-hidden="true" />
          {NAVIGATION.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.label}
                href={item.href}
                data-active={isActive ? "true" : "false"}
                className={isActive ? styles.navigationActive : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
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
            {cartCount > 0 && (
              <i className="cartBadge" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </i>
            )}
          </span>
        </button>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/catalogo">Catálogo</Link>
        <span className={styles.separator}>/</span>
        <Link href="/catalogo#catalogo-items">{product.categoria}</Link>
        <span className={styles.separator}>/</span>
        <span>{product.nombre}</span>
      </div>

      <section className={styles.product}>
        <div className={`${styles.media} ${product.foto ? styles.mediaPhoto : ""}`}>
          {product.foto ? (
            <Image
              src={product.foto}
              alt={product.nombre}
              fill
              priority
              sizes="(max-width: 900px) 92vw, 46vw"
              className={styles.mediaImage}
            />
          ) : (
            <div className={styles.graphic} aria-hidden="true">
              <div className={styles.orbit}><i /><i /><i /></div>
              <Icon size={96} strokeWidth={1} />
              <span>{product.sku}</span>
            </div>
          )}
          {soldOut ? (
            <span className={`${styles.mediaFlag} ${styles.flagOut}`}>Agotado</span>
          ) : lowStock ? (
            <span className={`${styles.mediaFlag} ${styles.flagLow}`}>Últimas unidades</span>
          ) : null}
        </div>

        <div className={styles.info}>
          <p className={styles.eyebrow}><i /> {product.categoria}</p>
          <h1>{product.nombre}</h1>
          <p className={styles.meta}>
            SKU {product.sku}
            {product.marca ? ` · ${product.marca}` : ""} · {product.unidad}
          </p>

          <div className={styles.priceRow}>
            <strong>{formatPrice(product.precio)}</strong>
            <span
              className={`${styles.stock} ${soldOut ? styles.stockOut : lowStock ? styles.stockLow : ""}`}
            >
              <i aria-hidden="true" />
              {soldOut ? "Agotado" : `${stock.toLocaleString("es-HN")} pzs disponibles`}
            </span>
          </div>

          <div className={styles.actions}>
            <div className={styles.qty}>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Quitar una unidad"
              >
                <Minus size={15} aria-hidden="true" />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => value + 1)}
                aria-label="Agregar una unidad"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
            <button type="button" className={styles.primary} onClick={handleAddToQuote}>
              Añadir a cotización
              <ShoppingCart size={16} aria-hidden="true" />
            </button>
          </div>

          <Link className={styles.secondary} href="/contacto">
            Pedir asesoría técnica
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>

          <dl className={styles.specs}>
            <div><dt>SKU</dt><dd>{product.sku}</dd></div>
            <div><dt>Marca</dt><dd>{product.marca || "Arconet"}</dd></div>
            <div><dt>Categoría</dt><dd>{product.categoria}</dd></div>
            <div><dt>Presentación</dt><dd>{product.unidad}</dd></div>
            <div>
              <dt>Disponibilidad</dt>
              <dd>{soldOut ? "Agotado" : `${stock.toLocaleString("es-HN")} pzs`}</dd>
            </div>
          </dl>

          <ul className={styles.trust}>
            {TRUST.map((item) => {
              const TrustIcon = item.icon;
              return (
                <li key={item.label}>
                  <TrustIcon size={16} aria-hidden="true" />
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {related.length ? (
        <section className={styles.related} aria-label="Productos relacionados">
          <div className={styles.relatedHead}>
            <div>
              <p className={styles.eyebrow}><i /> Misma categoría</p>
              <h2>También te puede servir</h2>
            </div>
            <Link className={styles.relatedAll} href="/catalogo">
              Ver catálogo completo <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/catalogo/producto/${item.id}`}
                className={styles.relatedCard}
              >
                <div className={styles.relatedMedia}>
                  {item.foto ? (
                    <Image
                      src={item.foto}
                      alt={item.nombre}
                      fill
                      sizes="(max-width: 700px) 46vw, 22vw"
                      className={styles.relatedImage}
                    />
                  ) : (
                    <span className={styles.relatedCode}>{item.sku}</span>
                  )}
                </div>
                <p>{item.categoria}</p>
                <h3>{item.nombre}</h3>
                <strong>{formatPrice(item.precio)}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Footer />
    </main>
  );
}
