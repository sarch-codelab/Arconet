"use client";

import { useCallback, useEffect, useRef } from "react";
import { countOpenDialogs, subscribeToOpenDialogs } from "./drag-scroll";

/**
 * Scroll suave del panel administrativo.
 *
 * Se usa Lenis directo (y no `locomotive-scroll` como en la home o el
 * catalogo) porque el panel combina `position: fixed` (barra lateral) con
 * `position: sticky` (cabecera): locomotive-scroll envuelve el documento en
 * un contenedor transformado y dejaria ambos fuera de posicion.
 *
 * Mantiene las mismas opciones que el resto del sitio (lerp 0.085, rueda
 * suave, `respectReducedMotion`) para que la sensacion sea identica.
 */
export function useAdminSmoothScroll() {
  const lenisRef = useRef(null);
  const progressRef = useRef(0);

  const setProgress = useCallback((value) => {
    const clamped = Math.min(Math.max(Number(value) || 0, 0), 1);
    progressRef.current = clamped;
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--admin-scroll-progress",
      clamped.toFixed(4),
    );
  }, []);

  useEffect(() => {
    let lenis = null;
    let cancelled = false;
    let detachNative = null;
    let detachDialogs = null;

    // Lenis devuelve `progress = 1` mientras todavia no conoce el limite de
    // scroll, por eso el valor inicial se lee del documento.
    const readDocumentProgress = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      return Math.min(Math.max(window.scrollY / max, 0), 1);
    };

    const init = async () => {
      try {
        const { default: Lenis } = await import("lenis");
        if (cancelled) return;

        lenis = new Lenis({
          anchors: true,
          autoRaf: true,
          lerp: 0.085,
          respectReducedMotion: true,
          smoothWheel: true,
          syncTouch: false,
          // Red de seguridad para emergentes fuera del panel (Vista previa de
          // impresion, dialogos del catalogo): la rueda sobre cualquier capa
          // modal usa el scroll nativo del navegador. Sin esto, Lenis consume
          // el evento de rueda de la pagina y cancela (preventDefault) el
          // desplazamiento del dialogo: el mouse "no detectaba" la emergente.
          prevent: (node) =>
            typeof node.closest === "function" &&
            Boolean(node.closest("[data-admin-overlay], dialog[open]")),
        });

        lenis.on("scroll", (instance) => {
          const limit = Number(instance?.limit) || 0;
          const value = limit > 0 ? (instance.scroll || 0) / limit : 0;
          setProgress(value);
        });
        lenisRef.current = lenis;
        // Con una emergente abierta, la rueda debe desplazar el dialogo y no
        // la pagina de fondo. `stop()` detiene la interpolacion sin tocar el
        // desplazamiento del documento, de modo que al cerrar todo sigue
        // donde estaba. (Antes, la rueda dentro de un modal con la pagina
        // bloqueada igual movia el fondo: parecia que la emergente "no
        // detectaba" el mouse.)
        detachDialogs = subscribeToOpenDialogs((count) => {
          if (count > 0) lenis.stop();
          else lenis.start();
        });
        // La suscripcion entrega el valor actual al registrarse, asi que un
        // montaje tardio tambien queda bloqueado aqui.
        if (countOpenDialogs() > 0) lenis.stop();
        setProgress(0);

        requestAnimationFrame(() => {
          if (!cancelled) setProgress(readDocumentProgress());
        });
      } catch {
        // Si Lenis no puede cargarse, el scroll nativo sigue funcionando:
        // solo se pierde la interpolacion, nunca el contenido.
        const onNativeScroll = () => setProgress(readDocumentProgress());
        window.addEventListener("scroll", onNativeScroll, { passive: true });
        window.addEventListener("resize", onNativeScroll, { passive: true });
        onNativeScroll();
        detachNative = () => {
          window.removeEventListener("scroll", onNativeScroll);
          window.removeEventListener("resize", onNativeScroll);
        };
      }
    };

    init();

    return () => {
      cancelled = true;
      detachNative?.();
      detachDialogs?.();
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [setProgress]);

  /**
   * Vuelve al inicio del panel. Se usa al cambiar de seccion para que el
   * contenido nuevo no aparezca a media pagina.
   */
  const scrollToTop = useCallback(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { lenisRef, scrollToTop };
}
