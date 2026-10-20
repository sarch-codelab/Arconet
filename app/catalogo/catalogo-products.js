"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Carga los productos activos de la BD y los expone agrupados por categoría.
 * Devuelve { byCategory, loading } donde byCategory es un mapa
 * categoría -> lista de productos.
 */
export function useCatalogProducts() {
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/catalogo")
      .then((response) => (response.ok ? response.json() : []))
      .then((products) => {
        if (!active || !Array.isArray(products)) return;
        const grouped = {};
        for (const product of products) {
          const key = product.categoria || "Otros";
          (grouped[key] ||= []).push(product);
        }
        setByCategory(grouped);
      })
      .catch(() => {
        if (active) setByCategory({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { byCategory, loading };
}

function formatPrice(value) {
  const price = Number(value) || 0;
  return price.toLocaleString("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2,
  });
}

/**
 * Lista de productos reales (de la BD) para una categoría del catálogo.
 * No renderiza nada si la categoría no tiene productos activos.
 */
export default function CatalogoProducts({ products, title = "Productos disponibles", className = "" }) {
  if (!products || products.length === 0) return null;

  return (
    <section className={className} aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <div>
              {product.foto ? (
                <Image src={product.foto} alt={product.nombre} width={64} height={64} />
              ) : (
                <span aria-hidden="true">{product.nombre.charAt(0)}</span>
              )}
            </div>
            <div>
              <strong>{product.nombre}</strong>
              <small>
                {product.marca ? `${product.marca} · ` : ""}SKU {product.sku}
              </small>
            </div>
            <div>
              <span>{formatPrice(product.precio)}</span>
              <small>
                {product.stock > 0
                  ? `${product.stock.toLocaleString("es-HN")} ${product.unidad.toLowerCase()}`
                  : "Agotado"}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
