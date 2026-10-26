"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ScanLine, X } from "lucide-react";
import styles from "./barcode-scan.module.css";

/**
 * Botón + overlay para leer el código de barras con la cámara del teléfono.
 *
 * Usa la API nativa `BarcodeDetector` (Chrome/Edge/Android). Si el navegador no
 * la soporta se avisa en el propio panel y el código se puede teclear a mano,
 * de modo que el campo nunca queda bloqueado.
 */

const FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "codabar",
  "qr_code",
];

function supportsScanner() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export default function BarcodeScanner({ onDetect, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  // El callback cambia en cada render del formulario; guardarlo en un ref
  // evita reiniciar la cámara cada vez que el padre se vuelve a pintar.
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const stop = useCallback(() => {
    if (frameRef.current) {
      window.clearTimeout(frameRef.current);
      frameRef.current = 0;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const close = useCallback(() => {
    stop();
    setOpen(false);
    setStatus("idle");
  }, [stop]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite abrir la cámara desde la página. Escribe el código a mano.");
        setStatus("error");
        return;
      }
      if (!supportsScanner()) {
        setError("Este navegador no incluye lector de códigos. Usa Chrome en Android o escribe el código a mano.");
        setStatus("error");
        return;
      }

      try {
        setStatus("starting");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        let detector;
        try {
          detector = new window.BarcodeDetector({ formats: FORMATS });
        } catch {
          detector = new window.BarcodeDetector();
        }

        setStatus("scanning");

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue?.trim();
            if (value) {
              onDetectRef.current?.(value);
              close();
              return;
            }
          } catch {
            // Un fotograma ilegible no debe cortar el escaneo.
          }
          frameRef.current = window.setTimeout(tick, 220);
        };
        frameRef.current = window.setTimeout(tick, 300);
      } catch (err) {
        if (cancelled) return;
        const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
        setError(
          denied
            ? "No diste permiso para usar la cámara. Habilítalo en el navegador o escribe el código a mano."
            : "No se pudo abrir la cámara. Revisa que no la esté usando otra aplicación.",
        );
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, close, stop]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        disabled={disabled}
        title="Escanear el código de barras con la cámara"
        aria-label="Escanear código de barras con la cámara"
      >
        <ScanLine size={16} aria-hidden="true" />
        Escanear
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className={styles.layer} role="dialog" aria-modal="true" aria-label="Escáner de código de barras">
          <button type="button" className={styles.backdrop} aria-label="Cerrar escáner" onClick={close} />
          <div className={styles.sheet}>
            <header className={styles.head}>
              <h3><Camera size={16} aria-hidden="true" /> Escanear código</h3>
              <button type="button" className={styles.close} onClick={close} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.viewport}>
              <video ref={videoRef} className={styles.video} muted playsInline autoPlay />
              <span className={styles.reticle} aria-hidden="true" />
              {status !== "scanning" && (
                <p className={styles.hint}>
                  {status === "error" ? error : "Apunta la cámara al código de barras del fabricante…"}
                </p>
              )}
            </div>

            {error && status === "error" ? null : (
              <p className={styles.hint}>Alinea el código dentro del recuadro. Se detecta solo.</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
