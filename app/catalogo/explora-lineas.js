"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CHIPS } from "./vitrina-data";
import { paginaDe } from "./vitrina-paginacion";
import styles from "./catalogo-experience.module.css";

// Son filtros reales, no categorías inventadas de popularidad o valoraciones.
export function productosPorLinea(productos, linea) {
  if (linea === "destacados") return productos.filter(producto => producto.origen !== "tienda");
  // Prioriza el inventario disponible para no repetir siempre la fila editorial.
  if (linea === "todas") return [...productos.filter(producto => producto.origen === "tienda"), ...productos.filter(producto => producto.origen !== "tienda")];
  if (linea === "ofertas") return productos.filter(producto => producto.offer);
  return productos.filter(producto => producto.category === linea);
}

export default function ExploraLineas({ productos, loading, error }) {
  const [linea, setLinea] = useState("todas");
  const [pagina, setPagina] = useState(0);
  const filtrados = useMemo(() => productosPorLinea(productos, linea), [productos, linea]);
  const resultado = paginaDe(filtrados, pagina);
  const opciones = [{ id: "destacados", label: "Destacados" }, ...CHIPS];

  return (
    <section className={`${styles.section} ${styles.explora}`} aria-labelledby="titulo-explora-lineas">
      <div className={styles.exploraHead}>
        <div>
          <span className={styles.sectionEyebrow}>Encuentra lo que necesitas</span>
          <h2 className={styles.sectionTitle} id="titulo-explora-lineas">Explora nuestros equipos</h2>
        </div>
        <div className={styles.rowArrows}>
          <button type="button" aria-label="Equipos anteriores" aria-controls={filtrados.length ? "equipos-explora" : undefined}
            disabled={resultado.actual === 0} onClick={() => setPagina(resultado.actual - 1)}>
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Equipos siguientes" aria-controls={filtrados.length ? "equipos-explora" : undefined}
            disabled={resultado.actual >= resultado.totalPaginas - 1} onClick={() => setPagina(resultado.actual + 1)}>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.exploraFilters} role="group" aria-label="Explorar equipos por línea">
        {opciones.map(opcion => (
          <button key={opcion.id} type="button" aria-pressed={linea === opcion.id}
            onClick={() => { setLinea(opcion.id); setPagina(0); }}>
            {opcion.label}
          </button>
        ))}
      </div>
      <p className={styles.srOnly} role="status">{filtrados.length} equipos. Página {resultado.actual + 1} de {resultado.totalPaginas}.</p>
      {filtrados.length ? (
        <div className={styles.exploraGrid} id="equipos-explora">
          {resultado.elementos.map(producto => (
            <article key={`${producto.origen || "editorial"}-${producto.id}`} className={styles.exploraCard}>
              <Link href={producto.href} className={styles.exploraMedia} tabIndex={-1} aria-hidden="true">
                <Image src={producto.image} alt="" fill unoptimized={producto.image.startsWith("https://") || producto.image.startsWith("/api/foto-catalogo/")}
                  sizes="(max-width: 620px) 46vw, (max-width: 900px) 31vw, 16vw" className={styles.exploraImage} draggable={false} />
                {producto.origen !== "tienda" && <Image src="/catalogo-vitrina/medalla-destacado.png" alt="" width={237} height={348} className={styles.featuredMedal} draggable={false} />}
                {producto.offer && <span className={styles.offerTag}>Oferta</span>}
              </Link>
              <div className={styles.exploraCopy}>
                <Link href={producto.href}>{producto.name}</Link>
                <span>{producto.line}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.exploraEmpty} role="status">
          {loading ? "Cargando equipos disponibles…" : error ? "No pudimos cargar los equipos de la tienda. Intenta recargar la página." : "No hay equipos disponibles para esta línea en este momento."}
        </div>
      )}
    </section>
  );
}
