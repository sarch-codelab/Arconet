"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { observeNativeScroll } from "@/lib/native-scroll";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Cable,
  Check,
  ChevronRight,
  Gauge,
  Layers,
  Minus,
  Network,
  PackageCheck,
  Plus,
  Radio,
  Ruler,
  Server,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Wrench,
  X,
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

// Las categorias pueden quedar escritas con distinta mayúscula, acentos o
// espacios (y a veces guardan el slug y no el nombre): para coincidencias de
// iconos y de listado se normaliza la comparación.
const normalizarCategoria = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();

const PRODUCT_ICONS_NORMALIZADO = Object.fromEntries(
  Object.entries(PRODUCT_ICONS).map(([nombre, icono]) => [normalizarCategoria(nombre), icono])
);
import { findFamily, formatPrice } from "../../catalogo-data";
import { useCatalogProducts } from "../../catalogo-products";
import { useCart } from "../../../cart-context";
import styles from "./category-products.module.css";
import Footer from "../../../footer";
import NavDock from "../../../nav-dock";
import { STORE_NAVIGATION } from "../../../navigation-data";
import CategoryFilters, { ORDEN_OPCIONES } from "./category-filters";
import CategoryToolbar from "./category-toolbar";

// Clave de la preferencia de tamaño de tarjeta (vista grande, compacta o lista).
const VISTA_KEY = "arconet-catalogo-vista";

const SUPPORT_ITEMS = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: ArrowRight, title: "Asesoría antes de comprar", text: "Revisamos tu proyecto y te recomendamos lo que sí sirve." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde esté tu instalación." },
];

// Tarjeta de producto del listado: el selector de cantidad y el botón de
// compra van en un mismo bloque (igual que la ficha del producto), para que
// el paso de unidades quede claro antes de añadir al carrito.
function CategoryProductCard({ product, index, onAdd }) {
  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const lowStock = stock > 0 && stock <= 5;
  const stockState = soldOut ? "out" : lowStock ? "low" : "ok";
  const Icon = PRODUCT_ICONS_NORMALIZADO[normalizarCategoria(product.categoria)] || SlidersHorizontal;
  const code = String(index + 1).padStart(2, "0");
  const [quantity, setQuantity] = useState(1);

  const add = () => {
    onAdd(product, quantity);
    setQuantity(1);
  };

  return (
    <li className={styles.familyCard}>
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

        <Link className={styles.familyLink} href={`/tienda/producto/${product.id}`}>
          Ver detalle y cotizar <ArrowUpRight size={16} aria-hidden="true" />
        </Link>

        <div className={styles.familyActions}>
          <div className={styles.familyQty} role="group" aria-label={`Cantidad de ${product.nombre}`}>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label="Quitar una unidad"
              disabled={quantity <= 1}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span aria-live="polite" aria-label={`Cantidad: ${quantity}`}>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(999, value + 1))}
              aria-label="Agregar una unidad"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className={`${styles.familyCartButton} ${soldOut ? styles.agotado : ""}`}
            onClick={add}
            disabled={soldOut}
            aria-label={`Añadir ${product.nombre} al carrito`}
          >
            {soldOut ? "Agotado" : "Añadir al Carrito"}
            <span><ShoppingCart size={15} aria-hidden="true" /></span>
          </button>
        </div>
      </div>
    </li>
  );
}

export default function CategoryProducts({
  slug,
  categoryName = null,
  categoryDescription = "",
  categoryPhoto = "",
  productosIniciales = [],
  blocked = false,
}) {
  const staticFamily = useMemo(
    () => findFamily(slug) || (categoryName ? findFamily(categoryName) : null),
    [slug, categoryName],
  );
  const family = useMemo(() => categoryName
    ? {
        ...(staticFamily || {}),
        slug: staticFamily?.slug || slug,
        category: categoryName,
        title: categoryName,
        badge: staticFamily?.badge || "Línea",
        // El resumen es el teaser corto; la descripcion larga puede venir de
        // la base. Cuando la base solo tiene un texto, queda una sola
        // linea (antes se pintaba dos veces iguales).
        summary: staticFamily?.summary || categoryDescription || "Productos disponibles en esta línea.",
        description:
          categoryDescription ||
          staticFamily?.description ||
          "Explora las referencias disponibles y cotiza con el equipo técnico de Arconet.",
        items: staticFamily?.items || [],
        image: categoryPhoto || staticFamily?.image || "",
        imageAlt: categoryName,
      }
    : staticFamily, [categoryName, categoryDescription, categoryPhoto, slug, staticFamily]);
  const pageRef = useRef(null);
  const topbarRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rangoPrecio, setRangoPrecio] = useState({ min: "", max: "" });
  const [marcasActivas, setMarcasActivas] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState("todas");
  const [orden, setOrden] = useState("relevancia");
  const [vista, setVista] = useState("grande");
  const { addItem, open: openCart, count: cartCount } = useCart();
  const { products, loading: productsLoading } = useCatalogProducts(productosIniciales);

  // La preferencia de vista es del usuario, no de la sesión: se recuerda entre
  // visitas para que quien prefiere la lista no tenga que cambiarla cada vez.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const guardado = window.localStorage.getItem(VISTA_KEY);
        if (guardado === "grande" || guardado === "compacta" || guardado === "lista") setVista(guardado);
      } catch {
        // Sin almacenamiento (modo privado estricto) se queda la vista grande.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const cambiarVista = (nueva) => {
    setVista(nueva);
    try {
      window.localStorage.setItem(VISTA_KEY, nueva);
    } catch {
      // Preferencia no persistida; la vista sigue funcionando en esta visita.
    }
  };

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const updateScroll = ({ progress }) => {
      const pageProgress = progress;
      topbarRef.current?.style.setProperty("--scroll-progress", pageProgress.toFixed(4));
    };

    const scrollController = observeNativeScroll(updateScroll);

    return () => {
      scrollController.destroy();
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll(`.${styles.reveal}`);
    if (!targets.length) return undefined;

    // El revelado es un adorno, nunca una condición para ver el contenido:
    // si no hay IntersectionObserver, se aplica el estado final y ya está.
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
      // threshold 0: con 0.12 una sección de 50 tarjetas es más alta que el
      // viewport, jamás alcanza el 12 % de su propia área visible y el
      // observador no vuelve a avisar → los productos quedaban en opacity: 0.
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = (product, quantity = 1) => {
    addItem(
      {
        slug: product.id,
        href: `/tienda/producto/${product.id}`,
        title: product.nombre,
        category: product.categoria,
        index: "01",
        image: product.foto,
        presentation: product.unidad,
      },
      quantity
    );
  };

  const categoryProducts = useMemo(() => {
    // Coincidencia tolerante: el valor guardado en el producto puede ser el
    // nombre o el slug, con distinta mayúscula o acentos.
    const targetCategoria = normalizarCategoria(family?.category);
    const targetSlug = normalizarCategoria(slug);
    return targetCategoria || targetSlug
      ? products.filter(
          (product) =>
            (targetCategoria && normalizarCategoria(product.categoria) === targetCategoria) ||
            (targetSlug && normalizarCategoria(product.categoria) === targetSlug),
        )
      : [];
  }, [products, family, slug]);

  // Solo las marcas que de verdad aparecen en esta línea; una lista con
  // marcas ausentes haría perder clics.
  const marcasDisponibles = useMemo(() => {
    const conteo = new Map();
    categoryProducts.forEach((producto) => {
      const marca = (producto.marca || "").trim();
      if (!marca) return;
      conteo.set(marca, (conteo.get(marca) || 0) + 1);
    });
    return [...conteo.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [categoryProducts]);

  const rangoPrecios = useMemo(() => {
    const precios = categoryProducts.map((producto) => Number(producto.precio) || 0);
    return precios.length
      ? { min: Math.floor(Math.min(...precios)), max: Math.ceil(Math.max(...precios)) }
      : { min: 0, max: 0 };
  }, [categoryProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("es");
    const min = rangoPrecio.min === "" ? 0 : Number(rangoPrecio.min);
    const max = rangoPrecio.max === "" ? Infinity : Number(rangoPrecio.max);

    const lista = categoryProducts.filter((product) => {
      const haystack = `${product.nombre} ${product.sku} ${product.marca || ""} ${product.categoria}`.toLocaleLowerCase("es");
      if (query && !haystack.includes(query)) return false;

      const precio = Number(product.precio) || 0;
      if (Number.isFinite(min) && precio < min) return false;
      if (Number.isFinite(max) && precio > max) return false;

      if (marcasActivas.length && !marcasActivas.includes((product.marca || "").trim())) return false;

      const stock = Number(product.stock) || 0;
      if (disponibilidad === "disponible" && stock <= 0) return false;
      if (disponibilidad === "agotado" && stock > 0) return false;

      return true;
    });

    const porPrecio = (a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0);
    if (orden === "precio-asc") lista.sort(porPrecio);
    else if (orden === "precio-desc") lista.sort((a, b) => porPrecio(b, a));
    else if (orden === "nombre") lista.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

    return lista;
  }, [categoryProducts, searchTerm, rangoPrecio, marcasActivas, disponibilidad, orden]);

  // Los productos que llegan del servidor se muestran aunque el refresco por
  // /api/catalogo siga en vuelo. "Cargando..." solo sustituye al listado
  // cuando todavía no hay NADA que pintar.
  const esperandoProductos = productsLoading && filteredProducts.length === 0;

  const limpiarFiltros = () => {
    setSearchTerm("");
    setRangoPrecio({ min: "", max: "" });
    setMarcasActivas([]);
    setDisponibilidad("todas");
    setOrden("relevancia");
  };

  const alternarMarca = (marca) =>
    setMarcasActivas((actual) =>
      actual.includes(marca) ? actual.filter((item) => item !== marca) : [...actual, marca]
    );

  if (blocked || !family) {
    return (
      <main className={styles.missing}>
        <p className={styles.eyebrow}>Catálogo Arconet</p>
        <h1>No encontramos esa línea.</h1>
        <p>Puede que haya cambiado de nombre. Te ayudamos a encontrarla en un minuto.</p>
        <div className={styles.missingActions}>
          <Link className={styles.primaryButton} href="/tienda">Volver al catálogo <ArrowRight size={16} /></Link>
          <Link className={styles.ghostDarkButton} href="/#contacto">Escribir al equipo <ArrowUpRight size={16} /></Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.category} ref={pageRef}>
      {/* Menú 2 del home, fijo desde el primer render: no depende de
          scrolledPastHero ni aparece después de hacer scroll. */}
      <NavDock
        variant="fixed"
        activeId="soluciones"
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

      <div className={styles.breadcrumb}>
        <Link href="/tienda">Tienda</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span>{family.category}</span>
      </div>

      {/* .hero NO lleva la clase reveal: el efecto de aparicion usa
          transform:translateY(...) y, al terminar, transition + transform.
          Mientras la transicion corre (o si IntersectionObserver no dispara),
          el section se pinta desplazado ~30px hacia abajo y su fondo asoma por
          encima de la foto como un "marco" gris detras de la imagen. La foto
          ahora es elemento en flujo dentro de .heroVisual, asi que cualquier
          offset del contenedor se ve como marco. El hero va siempre visible. */}
      <section className={styles.hero}>
        <div className={styles.heroVisual}>
          {family.image ? (
            /* Sin "fill": antes la imagen iba absoluta dentro de una caja con
               aspect-ratio fijo + overflow:hidden (el "marco"), lo que recortaba
               partes de la foto. Ahora se renderiza en flujo normal y crece con
               su proporcion natural: se ve COMPLETA, sin marco que la corte. */
            <Image
              src={family.image}
              alt={family.imageAlt}
              width={1200}
              height={900}
              priority
              unoptimized={String(family.image).startsWith("data:")}
              sizes="(max-width: 1023px) 90vw, (max-width: 1600px) 46vw, 720px"
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
          {family.summary && family.summary !== family.description ? (
            <p className={styles.heroDescription}>{family.summary}</p>
          ) : null}
          <p className={styles.heroText}>{family.description}</p>
          
          <ul className={styles.featureList}>
            {family.items.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>

          {/* El boton "Ver linea completa" se quito por pedido del cliente. */}
        </div>
      </section>

      <section className={`${styles.productsSection} ${styles.reveal}`} aria-label="Productos disponibles">
        <header className={styles.productsHeader}>
          <div>
            <h2>Productos disponibles</h2>
            <p>
              {categoryProducts.length} referencia{categoryProducts.length === 1 ? "" : "s"} de {family.category} con
              precio y existencia actualizados.
            </p>
          </div>
        </header>

        <div className={styles.productsLayout}>
          {!esperandoProductos ? (
            <CategoryFilters
              busqueda={searchTerm}
              onBusqueda={setSearchTerm}
              precio={rangoPrecio}
              onPrecio={setRangoPrecio}
              rangoPrecios={rangoPrecios}
              marcas={marcasDisponibles}
              marcasActivas={marcasActivas}
              onToggleMarca={alternarMarca}
              disponibilidad={disponibilidad}
              onDisponibilidad={setDisponibilidad}
              orden={orden}
              onOrden={setOrden}
              resultado={filteredProducts.length}
              total={categoryProducts.length}
              onLimpiar={limpiarFiltros}
            />
          ) : null}

          <div className={styles.productsMain}>
            <CategoryToolbar
              total={categoryProducts.length}
              resultado={filteredProducts.length}
              orden={orden}
              onOrden={setOrden}
              opcionesOrden={ORDEN_OPCIONES}
              vista={vista}
              onVista={cambiarVista}
            />

        {esperandoProductos ? (
          <div className={styles.loadingState}>
            <p>Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {categoryProducts.length
                ? "Ningún producto cumple esos filtros."
                : "No hay productos disponibles en esta línea."}
            </p>
            {/* Si hay productos pero los filtros los ocultaron, el camino de
                vuelta es quitar los filtros, no salir del catálogo. */}
            {categoryProducts.length ? (
              <button type="button" className={styles.primaryButton} onClick={limpiarFiltros}>
                Quitar filtros <X size={16} aria-hidden="true" />
              </button>
            ) : (
              <Link className={styles.primaryButton} href="/tienda">Ver todo el catálogo <ArrowRight size={16} /></Link>
            )}
          </div>
        ) : (
          <ul className={`${styles.productsGrid} ${styles[`vista_${vista}`] || ""}`}>
            {filteredProducts.map((product, index) => (
              <CategoryProductCard key={product.id} product={product} index={index} onAdd={handleAddToCart} />
            ))}
          </ul>
        )}
          </div>
        </div>
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
