"use client";

import { useEffect, useRef, useState } from "react";

// Contador de las cifras de la banda "Arconet en números".
//
// El número cuenta de 0 hasta su valor con una curva que arranca rápido y
// frena al final: esa caída de velocidad es lo que permite leer la cifra
// cuando llega, en vez de chocar contra el resultado.
//
// Se escribe con separador de miles en español y respeta el prefijo y sufijo
// del valor original ("+10" → "+10", "100%" → "100%").
//
// El servidor pinta la cifra final, así que sin JavaScript, con lectores de
// pantalla o para un buscador el número siempre está. El conteo empieza
// cuando la banda entra en pantalla, que es cuando se puede ver.

const DURACION = 1700;
// Arranca rápido y desacelera en el último tramo.
const curva = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Separa "100%" en { prefijo: "", numero: 100, sufijo: "%" }. */
function partir(valor) {
  const texto = String(valor);
  const partes = texto.match(/^(\D*)(\d+(?:[.,]\d+)?)(\D*)$/);
  if (!partes) return { prefijo: "", numero: null, sufijo: "", texto };
  const [, prefijo, cifra, sufijo] = partes;
  return { prefijo, numero: Number(cifra.replace(",", ".")), sufijo, texto };
}

function formatear(actual, partes) {
  if (partes.numero === null) return partes.texto;
  return `${partes.prefijo}${Math.round(actual).toLocaleString("es-HN")}${partes.sufijo}`;
}

export default function ContadorCifra({ valor }) {
  const partes = partir(valor);
  const ref = useRef(null);
  // null = todavía no se ha contado: se muestra la cifra final.
  const [actual, setActual] = useState(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || partes.numero === null) return undefined;

    let cuadro = 0;
    let arrancado = false;

    const lanzar = () => {
      if (arrancado) return;
      arrancado = true;
      setActual(0);
      // El reloj arranca AQUÍ y no al montar el componente: si se fijara en el
      // montaje, cuando la banda entra en pantalla el tiempo ya habría pasado
      // y el número saltaría directamente al valor final sin contar.
      const inicio = performance.now();
      const paso = (ahora) => {
        // El primer cuadro puede llegar con un `ahora` anterior a `inicio`
        // (requestAnimationFrame usa la marca del fotograma ya empezado): sin
        // acotar abajo, el número salía unos instantes en negativo.
        const t = Math.min(1, Math.max(0, (ahora - inicio) / DURACION));
        setActual(partes.numero * curva(t));
        if (t < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    };

    if (typeof IntersectionObserver === "undefined") {
      lanzar();
      return () => cancelAnimationFrame(cuadro);
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          lanzar();
          observador.unobserve(entrada.target);
        });
      },
      { threshold: 0.35 }
    );
    observador.observe(nodo);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, [partes.numero]);

  // Una sola capa de texto: la cifra que se ve es también la que lee un
  // lector de pantalla al terminar. Si se duplicara (una visible y otra oculta)
  // se leería el número dos veces.
  return (
    <strong ref={ref} aria-label={partes.texto}>
      {formatear(actual ?? partes.numero ?? 0, partes)}
    </strong>
  );
}
