"use client";

import {
  Boxes,
  Plus,
  Download,
  ArrowDownToLine,
  PackageCheck,
  AlertTriangle,
  Ban,
  Clock,
  Warehouse,
} from "lucide-react";
import styles from "./inventario-pills.module.css";

/**
 * Fila de píldoras de inventario.
 *
 * Dos grupos separados a propósito: los atajos ejecutan una acción y los
 * filtros cambian lo que se ve en la tabla. Mezclarlos en una sola fila hacía
 * que un clic "de acción" pareciera un filtro y al revés.
 */
export default function InventarioPills({
  onNuevoProducto,
  onEntrada,
  onExportar,
  filtro,
  onFiltroChange,
  conteos = {},
  puedeEscribir = false,
}) {
  const atajos = [
    puedeEscribir && {
      id: "nuevo",
      label: "Nuevo producto",
      icon: Plus,
      onClick: onNuevoProducto,
      tono: "primary",
    },
    puedeEscribir && {
      id: "entrada",
      label: "Registrar entrada",
      icon: ArrowDownToLine,
      onClick: onEntrada,
      tono: "primary",
    },
    {
      id: "exportar",
      label: "Exportar",
      icon: Download,
      onClick: onExportar,
    },
  ].filter(Boolean);

  const filtros = [
    { id: "todos", label: "Todos", icon: Boxes, conteo: conteos.todos },
    { id: "agotados", label: "Agotados", icon: Ban, conteo: conteos.agotados, tono: "danger" },
    { id: "bajo", label: "Bajo mínimo", icon: AlertTriangle, conteo: conteos.bajo, tono: "warn" },
    { id: "disponible", label: "Disponible", icon: PackageCheck, conteo: conteos.disponible },
    { id: "sinMovimiento", label: "Sin movimiento", icon: Clock, conteo: conteos.sinMovimiento },
    { id: "porBodega", label: "Por bodega", icon: Warehouse },
  ];

  return (
    <div className={styles.wrap}>
      {atajos.length > 0 && (
        <div className={styles.grupo} role="group" aria-label="Acciones de inventario">
          {atajos.map(({ id, label, icon: Icon, onClick, tono }) => (
            <button
              key={id}
              type="button"
              className={`${styles.pill} ${tono ? styles[tono] : ""}`}
              onClick={onClick}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.grupo} role="group" aria-label="Filtros rápidos de stock">
        {filtros.map(({ id, label, icon: Icon, conteo, tono }) => {
          const activo = filtro === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.pill} ${activo ? styles.activo : ""} ${tono ? styles[tono] : ""}`}
              onClick={() => onFiltroChange?.(id)}
              aria-pressed={activo}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              {typeof conteo === "number" && (
                <span className={styles.conteo}>{conteo}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
