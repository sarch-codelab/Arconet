"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LocomotiveScroll from "locomotive-scroll";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Cable,
  Gauge,
  Handshake,
  Layers,
  MessageCircle,
  Minus,
  Network,
  PackageCheck,
  Plus,
  Radio,
  Ruler,
  Server,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Wrench,
} from "lucide-react";
import { formatPrice } from "../../catalogo-data";
import { useCatalogProducts } from "../../catalogo-products";
import { useCart } from "../../../cart-context";
import Footer from "../../../footer";
import styles from "./product-page.module.css";
import MobileSiteMenu from "../../../mobile-site-menu";

const CATEGORY_ICONS = {
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

const TRUST = [
  { icon: PackageCheck, label: "Importación directa" },
  { icon: Handshake, label: "Asesoría antes de comprar" },
  { icon: Truck, label: "Entrega en Honduras" },
  { icon: ShieldCheck, label: "Garantía real" },
];

export default function ProductPage({ product }) {
  const [quantity, setQuantity] = useState(1);
  // Portada + galería en un solo carrusel: al tocar una miniatura cambia la
  // imagen grande. Antes las imágenes adicionales se listaban aparte y no se
  // podían abrir, así que parecía que solo existía la principal.
  const images = useMemo(() => {
    const all = [product.foto, ...(Array.isArray(product.fotos) ? product.fotos : [])]
      .filter((image) => typeof image === "string" && image.trim())
      .map((image) => image.trim());
    return [...new Set(all)];
  }, [product.foto, product.fotos]);
  const [activeImage, setActiveImage] = useState(0);
  const currentImage = images[activeImage] || "";
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const { addItem, open: openCart, count: cartCount } = useCart();
  const { products } = useCatalogProducts();
  const topbarRef = useRef(null);
  const pageRef = useRef(null);

  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const lowStock = stock > 0 && stock <= 20;
  const Icon = CATEGORY_ICONS[product.categoria] || SlidersHorizontal;
  const whatsappMessage = `Hola, necesito asesoría sobre ${product.nombre} (SKU ${product.sku}). Cantidad: ${quantity}.`;

  useEffect(() => {
    let active = true;
    fetch("/api/site-config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setWhatsappNumber(data?.whatsapp || ""); })
      .catch(() => { if (active) setWhatsappNumber(""); });
    return () => { active = false; };
  }, []);
  const NAVIGATION = [
    { href: "/catalogo", label: "Soluciones" },
    { href: "/#empresa", label: "La empresa" },
    { href: "/contacto", label: "Contacto" },
  ];

  useEffect(() => {
    const page = pageRef.current;
    const topbar = topbarRef.current;
    if (!page) return undefined;

    const updateScroll = ({ scroll = window.scrollY, limit, progress } = {}) => {
      const scrollable = Math.max(limit ?? document.documentElement.scrollHeight - window.innerHeight, 1);
      const pageProgress = typeof progress === "number" ? progress : Math.min(1, Math.max(0, scroll / scrollable));
      page.style.setProperty("--page-progress", pageProgress.toFixed(4));

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



  const related = products
    .filter((item) => item.categoria === product.categoria && item.id !== product.id)
    .slice(0, 3);

  const handleAddToQuote = () => {
    addItem(
      {
        slug: product.id,
        href: `/catalogo/producto/${product.id}`,
        title: product.nombre,
        category: product.categoria,
        image: product.foto || "",
        presentation: product.unidad || "Unidad",
      },
      quantity
    );
  };

  return (
    <main className={styles.page} ref={pageRef}>
      <header
        ref={topbarRef}
        className={styles.topbar}
      >
        <span className={styles.scrollProgress} aria-hidden="true">
          <i />
        </span>

        <div className={styles.topbarShell}>
          <a className={styles.topbarBrand} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
          </a>
          <MobileSiteMenu />

          <nav className={styles.topbarNav} aria-label="Navegación del catálogo">
            {NAVIGATION.map((item) => (
              <a
                key={item.label}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className={styles.topbarAction}
            onClick={openCart}
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
        <Link href="/">Inicio</Link>
        <span className={styles.separator}>/</span>
        <Link href="/catalogo">Catálogo</Link>
        <span className={styles.separator}>/</span>
        <Link href="/catalogo#catalogo-items">{product.categoria}</Link>
        <span className={styles.separator}>/</span>
        <span>{product.nombre}</span>
      </div>

      <section className={styles.product}>
        <div className={`${styles.media} ${currentImage ? styles.mediaPhoto : ""}`}>
          {currentImage ? (
            <Image
              src={currentImage}
              alt={`${product.nombre}${images.length > 1 ? ` — imagen ${activeImage + 1} de ${images.length}` : ""}`}
              fill
              priority
              unoptimized={String(currentImage).startsWith("data:")}
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

        {images.length > 1 && (
          <div className={styles.gallery} role="group" aria-label="Galería de imágenes del producto">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.galleryThumb} ${idx === activeImage ? styles.galleryThumbActive : ""}`}
                onClick={() => setActiveImage(idx)}
                aria-pressed={idx === activeImage}
                aria-label={`Ver imagen ${idx + 1} de ${images.length}`}
              >
                <Image
                  src={img}
                  alt=""
                  width={120}
                  height={120}
                  unoptimized={String(img).startsWith("data:")}
                  sizes="120px"
                  className={styles.galleryImage}
                />
              </button>
            ))}
          </div>
        )}

        <div className={styles.info}>
          <p className={styles.eyebrow}><i /> {product.categoria}</p>
          <h1>{product.nombre}</h1>
          <p className={styles.meta}>
            SKU {product.sku}
            {product.marca ? ` · ${product.marca}` : ""} · {product.unidad}
          </p>

          {product.descripcion ? (
            <p className={styles.description}>{product.descripcion}</p>
          ) : null}

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
          {whatsappNumber ? <a className={styles.whatsappLink} href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> Consultar por WhatsApp</a> : null}

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
