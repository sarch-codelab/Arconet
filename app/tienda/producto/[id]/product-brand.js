"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { findMarca, formatGarantia } from "@/lib/marcas";
import styles from "./product-brand.module.css";

/**
 * Identidad del fabricante en la ficha: logo sin marco, nombre de la marca y
 * garantía del producto. Sin valoración por estrellas: no hay reseñas reales y
 * una puntuación inventada es peor que ninguna.
 */
export default function ProductBrand({ marca, garantia }) {
  const marcaId = findMarca(marca);
  const garantiaTexto = formatGarantia(garantia);
  if (!marcaId && !garantiaTexto) return null;

  // Monograma solo cuando no hay logotipo y la marca no es Arconet (la casa no
  // necesita presumirse dentro de su propio catálogo).
  const mostrarMonograma = marcaId && !marcaId.logo && marcaId.id !== "arconet";

  return (
    <div className={styles.franja}>
      {marcaId ? (
        <div className={styles.marca}>
          {marcaId.logo ? (
            <Image
              src={marcaId.logo}
              alt={`Logotipo de ${marcaId.nombre}`}
              width={480}
              height={160}
              /* Sin el optimizador: son logos pequeños ya recortados y con
                 tamaño natural. El optimizador los devolvía a una caja
                 cuadrada y la marca perdía su proporción. */
              unoptimized
              className={styles.logo}
            />
          ) : mostrarMonograma ? (
            <span className={styles.monograma} aria-hidden="true">
              {marcaId.nombre.slice(0, 2).toUpperCase()}
            </span>
          ) : null}
          {/* Con logotipo el nombre sobra y se lee duplicado ("FiberHome
              FIBERHOME"); queda como respaldo textual cuando no hay archivo. */}
          {marcaId.logo ? null : <span className={styles.nombre}>{marcaId.nombre}</span>}
        </div>
      ) : null}

      {marcaId && garantiaTexto ? <span className={styles.separador} aria-hidden="true" /> : null}

      {garantiaTexto ? (
        <p className={styles.garantia}>
          <ShieldCheck size={15} aria-hidden="true" />
          <span>
            <small>Garantía</small>
            {garantiaTexto}
          </span>
        </p>
      ) : null}
    </div>
  );
}
