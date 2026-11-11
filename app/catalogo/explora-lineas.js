"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginaDe } from "./vitrina-paginacion";
import { leerVistos } from "./vistos-recientes";
import styles from "./catalogo-experience.module.css";

export const SECCIONES = [
  { id: "ia", label: "Recomendados por IA para ti" },
  { id: "tendencia", label: "Productos en tendencia" },
  { id: "vendidos", label: "Más vendidos" },
  { id: "novedades", label: "Novedades" },
  { id: "vistos", label: "Vistos recientemente" },
  { id: "valorados", label: "Mejor valorados" },
];

export function productosDeSeccion(productos, seccion, vistos = []) {
  if (seccion === "novedades") return productos
    .filter(producto => producto.origen === "tienda" && producto.creado && Number.isFinite(Date.parse(producto.creado)))
    .slice().sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado));
  if (seccion === "vistos") {
    const porRuta = new Map(productos.map(producto => [producto.href, producto]));
    return vistos.map(href => porRuta.get(href)).filter(Boolean);
  }
  return [];
}

const mensajes = {
  ia: "Las recomendaciones por IA aún no están disponibles.",
  tendencia: "Aún no hay datos disponibles de productos en tendencia.",
  vendidos: "Aún no hay datos disponibles de los productos más vendidos.",
  novedades: "Todavía no hay novedades disponibles.",
  vistos: "Aún no has visto productos en este navegador.",
  valorados: "Aún no hay valoraciones disponibles.",
};

export default function ExploraLineas({ productos, loading, error }) {
  const [seccion, setSeccion] = useState("novedades");
  const [pagina, setPagina] = useState(0);
  const [vistos, setVistos] = useState([]);
  const filtrados = useMemo(() => productosDeSeccion(productos, seccion, vistos), [productos, seccion, vistos]);
  const resultado = paginaDe(filtrados, pagina);

  return (
    <section className={`${styles.section} ${styles.explora}`} aria-labelledby="titulo-explora-lineas">
      <h2 className={styles.srOnly} id="titulo-explora-lineas">Explora nuestros equipos</h2>
      <div className={styles.exploraHead}>
        <div className={styles.exploraFilters} role="group" aria-label="Explorar equipos por selección">
          {SECCIONES.map(opcion => (
            <button key={opcion.id} type="button" aria-pressed={seccion === opcion.id}
              onClick={() => {
                if (opcion.id === "vistos") {
                  try { setVistos(leerVistos(window.localStorage)); } catch { setVistos([]); }
                }
                setSeccion(opcion.id); setPagina(0);
              }}>
              {opcion.label}
            </button>
          ))}
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
          {(seccion === "novedades" || seccion === "vistos") && loading ? "Cargando equipos disponibles…" :
            (seccion === "novedades" || seccion === "vistos") && error ? "No pudimos cargar los equipos de la tienda. Intenta recargar la página." : mensajes[seccion]}
        </div>
      )}
    </section>
  );
}
