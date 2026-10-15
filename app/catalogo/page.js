"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Headphones,
  Heart,
  LockKeyhole,
  Menu,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import styles from "./page.module.css";

const categories = [
  { name: "Moda", image: "/catalogo/fashion.jpg", note: "Shop now" },
  { name: "Tecnología", image: "/catalogo/electronics.jpg", note: "Shop now" },
  { name: "Belleza", image: "/catalogo/beauty.jpg", note: "Shop now" },
  { name: "Deportes", image: "/catalogo/fitness.jpg", note: "Shop now" },
  { name: "Hogar", image: "/catalogo/home.jpg", note: "Shop now" },
  { name: "Accesorios", image: "/catalogo/accessories.jpg", note: "Shop now" },
];

const products = [
  { id: "hoodie", name: "Essential Hoodie", category: "Moda", price: 59.99, oldPrice: 79.99, rating: "4.9", reviews: 128, image: "/catalogo/hoodie.jpg", tag: "Nuevo", color: "#d9cdbd" },
  { id: "sneakers", name: "Air Motion 270", category: "Deportes", price: 129.99, oldPrice: 159.99, rating: "4.8", reviews: 96, image: "/catalogo/sneakers.jpg", tag: "-20%", color: "#e8e5df" },
  { id: "headphones", name: "Wireless Headphones", category: "Tecnología", price: 99.99, oldPrice: 129.99, rating: "4.9", reviews: 214, image: "/catalogo/headphones.jpg", tag: "Nuevo", color: "#e4e2df" },
  { id: "watch", name: "Smart Watch Series 9", category: "Accesorios", price: 199.99, oldPrice: 249.99, rating: "4.7", reviews: 82, image: "/catalogo/watch.jpg", tag: "-15%", color: "#dedbd4" },
  { id: "bottle", name: "Stainless Steel Bottle", category: "Deportes", price: 24.99, oldPrice: null, rating: "4.8", reviews: 156, image: "/catalogo/bottle.jpg", tag: "Nuevo", color: "#dfe5e2" },
  { id: "sunglasses", name: "Aviator Sunglasses", category: "Accesorios", price: 89.99, oldPrice: 119.99, rating: "4.6", reviews: 74, image: "/catalogo/sunglasses.jpg", tag: "-25%", color: "#e6e3de" },
];

const bestSellers = [
  { id: "classic-hoodie", name: "Classic Hoodie", detail: "Comodidad para todos los días", price: "$59.99", image: "/catalogo/hoodie.jpg", badge: "Favorito" },
  { id: "air-motion", name: "Air Motion 270", detail: "Ligereza en cada paso", price: "$129.99", image: "/catalogo/sneakers.jpg", badge: "Más vendido" },
  { id: "studio-sound", name: "Studio Sound", detail: "Tu música, sin distracciones", price: "$349.99", image: "/catalogo/headphones.jpg", badge: "Favorito" },
];

const services = [
  { icon: Truck, title: "Envío gratis", text: "En compras desde $50" },
  { icon: LockKeyhole, title: "Pago seguro", text: "Compra con confianza" },
  { icon: RotateCcw, title: "Devoluciones fáciles", text: "30 días para decidir" },
  { icon: Headphones, title: "Estamos para ayudarte", text: "Soporte todos los días" },
];

function money(value) {
  return `$${value.toFixed(2)}`;
}

export default function CatalogoPage() {
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [favorites, setFavorites] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState("");

  const visibleProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("es");
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Todo" || product.category === activeCategory;
      const searchMatch = !query || `${product.name} ${product.category}`.toLocaleLowerCase("es").includes(query);
      const favoriteMatch = !favoritesOnly || favorites.includes(product.id);
      return categoryMatch && searchMatch && favoriteMatch;
    });
  }, [activeCategory, favorites, favoritesOnly, searchTerm]);

  const toggleFavorite = (id) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const addToCart = (id) => {
    const product = products.find((item) => item.id === id) || bestSellers.find((item) => item.id === id);
    if (product) setCartItems((items) => [...items, product.name]);
    setCartCount((count) => count + 1);
    setAddedProduct(id);
    window.setTimeout(() => setAddedProduct(""), 1200);
  };

  const selectCategory = (name) => {
    setActiveCategory(name);
    setFavoritesOnly(false);
    document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={styles.catalog}>
      <div className={styles.announcement}>
        <span>Envío gratis en compras mayores a $50</span>
        <i aria-hidden="true" />
        <span>Hasta 70% de descuento en seleccionados</span>
        <i aria-hidden="true" />
        <span>Ofertas por tiempo limitado</span>
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="NovaTrend, inicio">Nova<span>Trend</span><b>.</b></a>
        <button className={styles.menuButton} type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ""}`} aria-label="Navegación principal">
          <a className={styles.navActive} href="#top" onClick={() => setMenuOpen(false)}>Inicio</a>
          <a href="#new-arrivals" onClick={() => setMenuOpen(false)}>Tienda</a>
          <a href="#new-arrivals" onClick={() => setMenuOpen(false)}>Novedades</a>
          <a href="#best-sellers" onClick={() => setMenuOpen(false)}>Más vendidos</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Categorías <ChevronDown size={13} /></a>
          <a href="#about" onClick={() => setMenuOpen(false)}>Nosotros</a>
        </nav>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconButton} aria-label="Buscar" onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button>
          <button type="button" className={`${styles.iconButton} ${favoritesOnly ? styles.favoriteActive : ""}`} aria-label={`Ver favoritos, ${favorites.length} guardados`} aria-pressed={favoritesOnly} onClick={() => { setActiveCategory("Todo"); setSearchTerm(""); setFavoritesOnly((current) => !current); document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" }); }}><Heart size={19} /></button>
          <button type="button" className={styles.iconButton} aria-label="Mi cuenta"><UserRound size={19} /></button>
          <div className={styles.cartWrap}>
            <button type="button" className={styles.iconButton} aria-label={`Carrito, ${cartCount} artículos`} aria-expanded={cartOpen} onClick={() => setCartOpen((open) => !open)}><ShoppingBag size={19} /><span className={styles.cartCount}>{cartCount}</span></button>
            {cartOpen && <div className={styles.cartPanel}><strong>Mi carrito</strong>{cartItems.length ? <ul>{cartItems.map((name, index) => <li key={`${name}-${index}`}>{name}<span>Agregado</span></li>)}</ul> : <p>Tu carrito está vacío.</p>}<a href="#new-arrivals" onClick={() => setCartOpen(false)}>Seguir comprando <ArrowRight size={14} /></a></div>}
          </div>
        </div>
      </header>

      {searchOpen && (
        <form className={styles.searchPanel} onSubmit={(event) => { event.preventDefault(); document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" }); }}>
          <Search size={18} aria-hidden="true" />
          <input autoFocus value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setActiveCategory("Todo"); setFavoritesOnly(false); }} placeholder="¿Qué estás buscando?" aria-label="Buscar productos" />
          {searchTerm && <button type="button" className={styles.clearSearch} onClick={() => setSearchTerm("")} aria-label="Limpiar búsqueda"><X size={18} /></button>}
          <button className={styles.searchSubmit} type="submit">Buscar <ArrowRight size={15} /></button>
        </form>
      )}

      <section id="top" className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> Tendencias de temporada</p>
          <h1>Descubre productos que <em>te encantarán.</em></h1>
          <p className={styles.heroText}>Encuentra tus favoritos y dale un nuevo aire a cada día. Estilo, tecnología y bienestar en un solo lugar.</p>
          <div className={styles.heroButtons}>
            <a className={styles.primaryButton} href="#new-arrivals">Comprar ahora <ArrowRight size={16} /></a>
            <a className={styles.secondaryButton} href="#categories">Explorar colección</a>
          </div>
          <div className={styles.socialProof}>
            <div className={styles.avatarStack} aria-hidden="true"><span>AM</span><span>LC</span><span>JR</span><span>+</span></div>
            <span>Más de <strong>10,000</strong> clientes felices</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroShape} />
          <Image className={styles.heroImage} src="/catalogo/hero.jpg" alt="Moda contemporánea de la nueva temporada" fill priority sizes="(max-width: 760px) 100vw, 62vw" />
          <div className={`${styles.floatProduct} ${styles.floatShoe}`}><Image src="/catalogo/sneakers.jpg" alt="Tenis Air Motion" width={76} height={58} /><span>Air Motion 270<strong>$129.99</strong></span></div>
          <div className={`${styles.floatProduct} ${styles.floatWatch}`}><Image src="/catalogo/watch.jpg" alt="Smart watch" width={60} height={60} /><span>Smart Watch<strong>$199.99</strong></span></div>
          <div className={`${styles.floatProduct} ${styles.floatAudio}`}><Image src="/catalogo/headphones.jpg" alt="Auriculares inalámbricos" width={68} height={58} /><span>Wireless Audio<strong>$99.99</strong></span></div>
          <span className={styles.heroIndex}>01 <i /> 04</span>
        </div>
      </section>

      <section className={styles.serviceStrip} aria-label="Beneficios de compra">
        {services.map(({ icon: Icon, title, text }) => (
          <div className={styles.service} key={title}><Icon size={23} strokeWidth={1.7} /><div><strong>{title}</strong><span>{text}</span></div></div>
        ))}
      </section>

      <section id="categories" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionKicker}>Encuentra tu estilo</p><h2>Compra por categoría</h2></div>
          <a className={styles.textLink} href="#new-arrivals">Ver todas <ArrowRight size={15} /></a>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((category, index) => (
            <button type="button" className={styles.categoryCard} key={category.name} onClick={() => selectCategory(category.name)}>
              <Image src={category.image} alt={category.name} fill sizes="(max-width: 640px) 46vw, (max-width: 1000px) 30vw, 16vw" />
              <span className={styles.categoryShade} />
              <span className={styles.categoryText}><span>0{index + 1}</span><strong>{category.name}</strong><small>{category.note} <ArrowRight size={12} /></small></span>
            </button>
          ))}
        </div>
      </section>

      <section id="new-arrivals" className={`${styles.section} ${styles.productsSection}`}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionKicker}>Recién llegados</p><h2>{favoritesOnly ? "Tus favoritos" : activeCategory === "Todo" ? "Novedades" : activeCategory}</h2></div>
          <div className={styles.headingActions}>
            {(activeCategory !== "Todo" || favoritesOnly) && <button type="button" className={styles.resetFilter} onClick={() => { setActiveCategory("Todo"); setFavoritesOnly(false); }}>Ver todo <X size={13} /></button>}
            <a className={styles.textLink} href="#new-arrivals">Ver novedades <ArrowRight size={15} /></a>
          </div>
        </div>
        <div className={styles.productGrid}>
          {visibleProducts.length ? visibleProducts.map((product) => (
            <article className={styles.productCard} key={product.id}>
              <div className={styles.productImage} style={{ "--product-bg": product.color }}>
                <Image src={product.image} alt={product.name} fill sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 16vw" />
                <span className={`${styles.productTag} ${product.tag.startsWith("-") ? styles.saleTag : ""}`}>{product.tag}</span>
                <button type="button" className={`${styles.favoriteButton} ${favorites.includes(product.id) ? styles.favoriteActive : ""}`} aria-label={favorites.includes(product.id) ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`} onClick={() => toggleFavorite(product.id)}><Heart size={16} fill={favorites.includes(product.id) ? "currentColor" : "none"} /></button>
                <button type="button" className={styles.quickAdd} aria-label={`Agregar ${product.name} al carrito`} onClick={() => addToCart(product.id)}>{addedProduct === product.id ? <Check size={17} /> : <ShoppingBag size={16} />}</button>
              </div>
              <div className={styles.productInfo}><p>{product.category}</p><h3>{product.name}</h3><div className={styles.rating}><span>★★★★★</span><small>{product.rating} ({product.reviews})</small></div><div className={styles.priceRow}><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}</div></div>
            </article>
          )) : <p className={styles.emptyResults}>No encontramos productos con esa búsqueda.</p>}
        </div>
      </section>

      <section id="best-sellers" className={`${styles.section} ${styles.bestSection}`}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionKicker}>Los favoritos de todos</p><h2>Más vendidos</h2></div>
          <a className={styles.textLink} href="#new-arrivals">Ver todos <ArrowRight size={15} /></a>
        </div>
        <div className={styles.bestGrid}>
          {bestSellers.map((product) => (
            <article className={styles.bestCard} key={product.id}>
              <div className={styles.bestImage}><Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 90vw, 30vw" /><span>{product.badge}</span></div>
              <div className={styles.bestInfo}><p>{product.detail}</p><h3>{product.name}</h3><strong>{product.price}</strong><button type="button" onClick={() => addToCart(product.id)}>{addedProduct === product.id ? "Agregado" : "Agregar al carrito"}<ArrowRight size={14} /></button></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.promoGrid}>
        <article className={styles.saleBanner}>
          <Image src="/catalogo/sneakers.jpg" alt="Tenis deportivos de temporada" fill sizes="(max-width: 700px) 100vw, 50vw" />
          <div><span>Venta especial</span><h2>Hasta 70%<br />de descuento</h2><p>Tu próximo favorito a un mejor precio.</p><a href="#new-arrivals">Comprar ofertas <ArrowRight size={15} /></a></div>
          <span className={styles.saleStamp}>-70%</span>
        </article>
        <article className={styles.collectionBanner}>
          <Image src="/catalogo/runner.jpg" alt="Nueva colección deportiva" fill sizes="(max-width: 700px) 100vw, 50vw" />
          <div><span>Nueva colección</span><h2>Muévete<br />a tu manera.</h2><p>Encuentra tu ritmo esta temporada.</p><a href="#categories">Descubrir colección <ArrowRight size={15} /></a></div>
        </article>
      </section>

      <footer id="about" className={styles.footer}>
        <a className={styles.brand} href="#top">Nova<span>Trend</span><b>.</b></a>
        <p>Estilo para todos los días. Descubre algo nuevo en cada visita.</p>
        <div className={styles.footerServices}>{services.map(({ icon: Icon, title, text }) => <div key={title}><Icon size={18} /><span><strong>{title}</strong><small>{text}</small></span></div>)}</div>
        <div className={styles.footerBottom}><span>© 2026 NovaTrend. Todos los derechos reservados.</span><span>Privacidad&nbsp;&nbsp; · &nbsp;&nbsp;Términos&nbsp;&nbsp; · &nbsp;&nbsp;Ayuda</span></div>
      </footer>
    </main>
  );
}
