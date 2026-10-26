"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImageUp, ScanLine, X } from "lucide-react";
import styles from "./barcode-scan.module.css";

/**
 * Botón + overlay para leer el código de barras con la cámara del teléfono.
 *
 * Estrategia de decodificación (por orden de preferencia):
 *  1. `BarcodeDetector` nativo cuando existe (Chrome/Edge Android y escritorio).
 *     Es lo más rápido y no añade peso a la descarga.
 *  2. ZXing como respaldo universal: funciona en Safari/iOS, Firefox y
 *     cualquier navegador que exponga `getUserMedia`, que es justo donde el
 *     detector nativo NO está disponible. Sin esto, el lector simplemente no
 *     arrancaba en iPhone/iPad ni en Firefox.
 *
 * La cámara requiere un contexto seguro (HTTPS o localhost); si falta, se
 * avisa con un mensaje claro y el código siempre puede teclearse a mano.
 */

let zxingPromise = null;
function loadZxing() {
  // Carga diferida: solo baja el decodificador cuando el escáner se abre y
  // el navegador no trae BarcodeDetector nativo.
  if (!zxingPromise) {
    zxingPromise = Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]).then(([browser, library]) => ({
      browser,
      library,
      reader: new browser.BrowserMultiFormatReader(),
    }));
  }
  return zxingPromise;
}

function supportsNativeScanner() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export default function BarcodeScanner({ onDetect, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  // En escritorio "environment" no existe: se lista el dispositivo frontal y
  // se ofrece un boton para levantar la webcam del equipo (Fase 2).
  const [isMobile, setIsMobile] = useState(() =>
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  );
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const controlsRef = useRef(null);
  const cancelledRef = useRef(false);
  // El callback cambia en cada render del formulario; guardarlo en un ref
  // evita reiniciar la cámara cada vez que el padre se vuelve a pintar.
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const stop = useCallback(() => {
    if (frameRef.current) {
      window.clearTimeout(frameRef.current);
      frameRef.current = 0;
    }
    const controls = controlsRef.current;
    controlsRef.current = null;
    if (controls) {
      try {
        controls.stop();
      } catch {
        /* ya estaba detenido */
      }
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
    cancelledRef.current = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setError(
          window.isSecureContext
            ? "Este navegador no permite abrir la cámara desde la página. Escribe el código a mano o sube una foto."
            : "La cámara solo funciona sobre HTTPS. Abre el sitio con https:// o escribe el código a mano.",
        );
        setStatus("error");
        return;
      }

      try {
        setStatus("starting");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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

        if (supportsNativeScanner()) {
          let detector;
          try {
            detector = new window.BarcodeDetector({
              formats: [
                "ean_13",
                "ean_8",
                "upc_a",
                "upc_e",
                "code_128",
                "code_39",
                "itf",
                "codabar",
                "qr_code",
              ],
            });
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
          return;
        }

        // Respaldo universal (Safari/iOS, Firefox, etc.) con ZXing.
        const { browser: zxing, library, reader } = await loadZxing();
        if (cancelled) return;
        setStatus("scanning");

        const hints = new Map();
        hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
          zxing.BarcodeFormat.EAN_13,
          zxing.BarcodeFormat.EAN_8,
          zxing.BarcodeFormat.UPC_A,
          zxing.BarcodeFormat.UPC_E,
          zxing.BarcodeFormat.CODE_128,
          zxing.BarcodeFormat.CODE_39,
          zxing.BarcodeFormat.ITF,
          zxing.BarcodeFormat.CODABAR,
          zxing.BarcodeFormat.QR_CODE,
        ]);
        hints.set(library.DecodeHintType.TRY_HARDER, true);

        const controls = await reader.decodeFromVideoDevice(
          undefined, // deja que el navegador elija: en móvil suele priorizar la cámara trasera
          videoRef.current,
          (result, err, ctrls) => {
            if (cancelled) return;
            const value = result?.text?.trim();
            if (value) {
              ctrls.stop();
              onDetectRef.current?.(value);
              close();
            }
          },
          hints,
        );
        if (cancelled) {
          try {
            controls.stop();
          } catch {
            /* noop */
          }
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        if (cancelled) return;
        const denied =
          err?.name === "NotAllowedError" ||
          err?.name === "SecurityError" ||
          err?.name === "PermissionDeniedError";
        const noCamera =
          err?.name === "NotFoundError" || err?.name === "OverconstrainedError";
        setError(
          denied
            ? "No diste permiso para usar la cámara. Habilítalo en el navegador o escribe el código a mano."
            : noCamera
              ? "No encontramos una cámara disponible en este dispositivo. Escribe el código a mano."
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

  // Escaneo de respaldo por imagen: funciona en cualquier equipo (webcam que
  // no levanta permisos, sin camara, o codigo impreso fotografiable). Usa el
  // decodificador ZXing sobre un frame estatico.
  const decodeFromImageFile = useCallback(async (file) => {
    if (!file) return;
    try {
      setError("");
      setStatus("starting");
      const { library } = await loadZxing();
      const url = URL.createObjectURL(file);
      try {
        const image = new window.Image();
        image.src = url;
        await image.decode();
        const hints = new Map();
        hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
          library.BarcodeFormat.EAN_13,
          library.BarcodeFormat.EAN_8,
          library.BarcodeFormat.UPC_A,
          library.BarcodeFormat.UPC_E,
          library.BarcodeFormat.CODE_128,
          library.BarcodeFormat.CODE_39,
          library.BarcodeFormat.ITF,
          library.BarcodeFormat.CODABAR,
          library.BarcodeFormat.QR_CODE,
        ]);
        hints.set(library.DecodeHintType.TRY_HARDER, true);
        const reader = new library.MultiFormatReader();
        const luminance = new library.HTMLCanvasElementLuminanceSource(image);
        const binarizer = new library.HybridBinarizer(luminance);
        const result = reader.decode(new library.BinaryBitmap(binarizer), hints);
        const value = result?.text?.trim();
        if (value) {
          onDetectRef.current?.(value);
          close();
        } else {
          setError("No se encontro un codigo en la imagen. Prueba con otra foto mas nitida.");
          setStatus("error");
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("No se pudo leer la imagen. Escribe el codigo a mano.");
      setStatus("error");
    }
  }, [close]);

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
                  {status === "error" ? error : isMobile
                    ? "Apunta la cámara al código de barras del fabricante…"
                    : "Coloca el código frente a la webcam o sube una foto."}
                </p>
              )}
            </div>

            {error && status === "error" ? null : (
              <p className={styles.hint}>Alinea el código dentro del recuadro. Se detecta solo.</p>
            )}

            <footer className={styles.actions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  decodeFromImageFile(file);
                }}
              />
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp size={15} aria-hidden="true" /> Leer desde imagen
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
