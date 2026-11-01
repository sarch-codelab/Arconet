"use client";

import { useEffect, useRef } from "react";
import styles from "./video-fondo-cta.module.css";

// Fondo en movimiento de las bandas de contacto ("Hagamos que todo conecte").
//
// Sustituye a la foto fija que había detrás del texto: es el mismo video de
// cintas en bucle, recortado a la banda. Se sirve una versión de 1080p sin
// audio (264 KB) en lugar del 4K original (7.9 MB).
//
// El video es decorativo: va `aria-hidden`, sin controles y silenciado, así
// que puede arrancar solo. Si el navegador no lo permite (ahorro de batería
// en algunos móviles) o falla la carga, el póster mantiene el fondo y el
// texto se lee igual.

const VIDEO = "/lines-fondo.mp4";
const POSTER = "/lines-poster.jpg";

export default function VideoFondoCTA({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    // `autoplay` en el atributo no basta cuando React monta el nodo: se
    // intenta reproducir a mano y se ignora el rechazo (el póster se queda).
    const intento = video.play();
    if (intento && typeof intento.catch === "function") intento.catch(() => {});
    return undefined;
  }, []);

  return (
    <div className={`${styles.fondo} ${className}`.trim()} aria-hidden="true">
      <video
        ref={ref}
        className={styles.video}
        src={VIDEO}
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        disablePictureInPicture
        controls={false}
      />
      <div className={styles.velo} />
    </div>
  );
}
