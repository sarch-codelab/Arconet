"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./video-fondo-cta.module.css";

// Fondo en movimiento de las bandas de contacto ("Hagamos que todo conecte").
//
// Es el video de cintas en bucle, recortado a la banda. Se sirve una versión
// de 1080p sin audio (264 KB) en lugar del 4K original (7.9 MB).
//
// Para que no cueste rendimiento en equipos modestos:
// - Solo se reproduce mientras la banda está en pantalla. Fuera de vista se
//   pausa: un video en bucle reproduce 30 fotogramas por segundo para siempre,
//   aunque no lo estés mirando.
// - Con el ahorro de datos activado no se descarga: queda el póster.
// - El video es decorativo: `aria-hidden`, silenciado y sin controles, así que
//   puede arrancar solo. Si el navegador lo rechaza, el póster mantiene el
//   fondo y el texto se lee igual.

const VIDEO = "/lines-fondo.mp4";
const POSTER = "/lines-poster.jpg";
const REDUCED_DATA_QUERY = "(prefers-reduced-data: reduce)";

function conexionDeRed() {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

function leerAhorroDeDatos() {
  const conexion = conexionDeRed();
  return Boolean(conexion?.saveData || window.matchMedia?.(REDUCED_DATA_QUERY)?.matches);
}

function suscribirAhorroDeDatos(listener) {
  const conexion = conexionDeRed();
  const consulta = window.matchMedia?.(REDUCED_DATA_QUERY);
  conexion?.addEventListener?.("change", listener);
  consulta?.addEventListener?.("change", listener);
  return () => {
    conexion?.removeEventListener?.("change", listener);
    consulta?.removeEventListener?.("change", listener);
  };
}

const leerAhorroDelServidor = () => true;

export default function VideoFondoCTA({ className = "" }) {
  const contenedor = useRef(null);
  const video = useRef(null);
  // Con ahorro de datos no se pide el archivo: se queda el póster. La
  // suscripción también apaga el video si la preferencia cambia en caliente.
  const ahorro = useSyncExternalStore(suscribirAhorroDeDatos, leerAhorroDeDatos, leerAhorroDelServidor);

  useEffect(() => {
    if (ahorro) return undefined;
    const nodo = contenedor.current;
    const reproductor = video.current;
    if (!nodo || !reproductor) return undefined;

    const reproducir = () => {
      const intento = reproductor.play();
      if (intento && typeof intento.catch === "function") intento.catch(() => {});
    };

    // Sin IntersectionObserver se reproduce sin más.
    if (typeof IntersectionObserver === "undefined") {
      reproducir();
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) reproducir();
          else reproductor.pause();
        });
      },
      // Se reproduce en cuanto asoma y se pausa al salir del todo.
      { threshold: 0.15 }
    );
    observador.observe(nodo);

    // Al volver a la pestaña se reanuda si la banda sigue a la vista.
    const alVolver = () => {
      if (document.visibilityState === "visible" && reproductor.paused) reproducir();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [ahorro]);

  return (
    <div ref={contenedor} className={`${styles.fondo} ${className}`.trim()} aria-hidden="true">
      <video
        ref={video}
        className={styles.video}
        src={ahorro ? undefined : VIDEO}
        poster={POSTER}
        autoPlay={!ahorro}
        muted
        loop
        playsInline
        preload={ahorro ? "none" : "metadata"}
        tabIndex={-1}
        disablePictureInPicture
        controls={false}
      />
      <div className={styles.velo} />
    </div>
  );
}
