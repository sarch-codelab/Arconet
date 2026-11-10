"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import Footer from "../../footer";
import { useCatalogProducts } from "../../tienda/catalogo-products";
import { coincideBusqueda } from "../busqueda-destacados";
import { CHIPS, PRODUCTS } from "../vitrina-data";
import { productosDeTienda } from "../vitrina-paginacion";
import vitrina from "../catalogo-experience.module.css";
import styles from "./destacados.module.css";

export default function Destacados() {
  const { products: inventario, loading, error } = useCatalogProducts();
  const [consulta, setConsulta] = useState("");
  const [linea, setLinea] = useState("todas");
  const productos = useMemo(() => [...PRODUCTS, ...productosDeTienda(inventario)], [inventario]);
  const filtrados = useMemo(() => productos.filter((producto) => {
    const coincideLinea = linea === "todas" || (linea === "ofertas" ? producto.offer : producto.category === linea);
    return coincideLinea && coincideBusqueda(producto, consulta);
  }), [productos, consulta, linea]);

  return (
    <>
      <main className={vitrina.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={vitrina.brand} aria-label="Arconet, ir al inicio">
              <Image src="/arconet.png" alt="Arconet" width={1200} height={200} sizes="128px" fetchPriority="low" className={vitrina.brandImg} />
              <span className={vitrina.brandTagline}>Descubre. Equipa. Conecta.</span>
            </Link>
            <span aria-hidden="true" />
          </div>
        </header>

        <div className={styles.wrap}>
          <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
            <Link href="/catalogo">Catálogo</Link><ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Productos destacados</span>
          </nav>
          <div className={styles.heading}>
            <span className={vitrina.sectionEyebrow}>Lo más buscado</span>
            <h1>Productos destacados</h1>
            <p>Explora nuestros equipos destacados y los productos disponibles para tu próxima instalación.</p>
          </div>

          <div className={styles.filters}>
            <label className={styles.search}>
              <span>Buscar productos</span>
              <div><Search size={18} aria-hidden="true" /><input type="search" value={consulta} onChange={(event) => setConsulta(event.target.value)} placeholder="Busca equipos o líneas..." /></div>
            </label>
            <div className={styles.select}>
              <label htmlFor="linea-destacados">Línea</label>
              <select id="linea-destacados" value={linea} onChange={(event) => setLinea(event.target.value)}>
                {CHIPS.map((chip) => <option key={chip.id} value={chip.id}>{chip.label}</option>)}
                <option value="otras">Otras líneas</option>
              </select>
            </div>
          </div>

          <div className={styles.resultsHeader}>
            <p role="status" aria-live="polite">{filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}{loading ? " · Cargando productos disponibles…" : ""}</p>
            {(consulta || linea !== "todas") && <button type="button" onClick={() => { setConsulta(""); setLinea("todas"); }}>Limpiar filtros</button>}
          </div>
          {error && <p className={styles.notice} role="status">No pudimos cargar los productos disponibles de la tienda. Puedes seguir explorando los destacados; intenta recargar la página más tarde.</p>}

          {filtrados.length > 0 ? (
            <div className={styles.grid} aria-label="Lista de productos destacados" aria-busy={loading}>
              {filtrados.map((producto) => (
                <article className={vitrina.productCard} key={`${producto.origen || "editorial"}-${producto.id}`}>
                  <Link href={producto.href} className={styles.cardLink}>
                    <div className={vitrina.productMedia}>
                      <Image src={producto.image} alt="" fill unoptimized={producto.image.startsWith("https://")} sizes="(max-width: 620px) 46vw, (max-width: 900px) 31vw, 24vw" className={vitrina.productImg} />
                      <Image src="/catalogo-vitrina/medalla-destacado.png" alt="" width={237} height={348} className={vitrina.featuredMedal} />
                      {producto.offer && <span className={vitrina.offerTag}>Oferta</span>}
                    </div>
                    <div className={vitrina.productBody}>
                      <span className={`${vitrina.productName} ${styles.cardName}`}>{producto.name}</span>
                      <span className={`${vitrina.productLine} ${styles.cardLine}`}>{producto.origen === "tienda" ? "Tienda · " : ""}{producto.line}</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={vitrina.empty}>
              <Search size={22} aria-hidden="true" />
              <strong>{loading ? "Buscando productos disponibles…" : "No encontramos equipos con esos filtros"}</strong>
              {!loading && <>
                <span>Prueba otra búsqueda o vuelve a todas las líneas.</span>
                <button type="button" onClick={() => { setConsulta(""); setLinea("todas"); }}>Limpiar filtros</button>
              </>}
            </div>
          )}
          <Link href="/catalogo#destacados" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Volver al catálogo</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
