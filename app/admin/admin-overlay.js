"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./admin-experience.module.css";
import { enableDragScroll, registerOpenDialog } from "./drag-scroll";

/**
 * Capa emergente del panel administrativo.
 *
 * Se monta en `<body>` mediante un portal para que ninguna seccion (tarjetas
 * con `overflow: hidden`, cabeceras `sticky`, contenedores con `transform`)
 * recorte la capa ni la desplace: el velo cubre la ventana completa en PC y
 * tableta, y el dialogo se centra con margen garantizado.
 *
 * Cambios de comportamiento frente a la version anterior:
 *  - En PC y tableta (~900 px o mas) el dialogo siempre se centra, con
 *    separacion del borde y desplazamiento interno. Antes, en tabletas y
 *    ventanas medianas heredaba la hoja inferior del telefono y quedaba pegado
 *    al fondo.
 *  - El contenido se puede deslizar arrastrando con el mouse (`drag-scroll`),
 *    ademas de con la rueda y el trackpad.
 *  - El velo recibe el atributo que detiene el scroll suave (ver
 *    `useAdminSmoothScroll`), de modo que la rueda no mueve la pagina de fondo.
 */
const subscribeNever = () => () => {};

export function Overlay({
  open = true,
  onDismiss,
  className,
  children,
  role = "presentation",
  ...rest
}) {
  // El portal solo existe en el cliente: en el servidor se devuelve `null` y
  // el primer render hidratado coincide (sin desajuste de hidratacion).
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={className || styles.overlay}
      data-admin-overlay=""
      data-lenis-prevent=""
      role={role}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Boton del velo: cierra la emergente al pulsar fuera del dialogo. */
export function OverlayDismiss({ children, ...rest }) {
  return (
    <button type="button" className={styles.overlayDismiss} tabIndex={-1} aria-hidden="true" {...rest}>
      {children}
    </button>
  );
}

/**
 * Fondo de un dialogo (`role="dialog"`) montado en el portal.
 *
 * Cierra al pulsar el velo -nunca al pulsar dentro del contenido-, bloquea el
 * scroll de la pagina mientras hay una emergente abierta y activa el deslice
 * con el mouse dentro del dialogo.
 */
export function DialogBackdrop({ onDismiss, className, label = "Cerrar", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const unregister = registerOpenDialog();
    return unregister;
  }, []);

  useEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    return enableDragScroll(host);
  }, []);

  // Cierra solo si el gesto empieza y termina en el velo. Se usa
  // `pointerdown` (no `click`) para que un clic que se origino dentro del
  // dialogo y termino fuera -por ejemplo al arrastrar texto- no lo cierre.
  const onPointerDown = (event) => {
    if (event.target === event.currentTarget && onDismiss) onDismiss();
  };

  return (
    <div
      ref={ref}
      className={className || styles.overlay}
      role="presentation"
      data-drag-scroll=""
      /* Lenis ignora la rueda dentro de un elemento con este atributo y deja
         que el navegador desplace el dialogo. Es imprescindible: con el scroll
         de la pagina detenido, Lenis cancela la rueda (preventDefault) y el
         contenido de la emergente no se movia con el mouse. */
      data-lenis-prevent=""
      onPointerDown={onPointerDown}
    >
      {children}
      {/* Etiqueta accesible del velo; el dialogo de dentro lleva su propio
          `role="dialog"` y `aria-modal`. */}
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
