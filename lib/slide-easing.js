// Interpolador corto para el recorrido horizontal de Soluciones.
//
// No intercepta rueda, touch ni teclado: el desplazamiento sigue siendo 100 %
// nativo. Solo suaviza el transform decorativo de la pista, porque una rueda
// de ratón avanza a muescas discretas (~100 px) y copiar scrollY en el
// transform producía saltos secos de cientos de píxeles.
//
// El bucle de RAF existe únicamente mientras `actual` alcanza a `objetivo`;
// en reposo no queda ningún fotograma pendiente. Con movimiento reducido o
// pestaña oculta se aplica el valor de golpe, sin animación.
export function createSlideEasing({
  paint,
  requestFrame,
  cancelFrame,
  reduced = () => false,
  hidden = () => false,
  tau = 90,
  epsilon = 0.0004,
} = {}) {
  let handle = 0;
  let actual = 0;
  let objetivo = 0;
  let ultimo = 0;

  const step = (now) => {
    handle = 0;
    const delta = ultimo ? Math.min(now - ultimo, 64) : 16;
    ultimo = now;
    actual += (objetivo - actual) * (1 - Math.exp(-delta / tau));
    if (Math.abs(objetivo - actual) < epsilon) actual = objetivo;
    paint(actual);
    if (actual !== objetivo) handle = requestFrame(step);
    else ultimo = 0;
  };

  const stop = () => {
    if (handle) cancelFrame(handle);
    handle = 0;
    ultimo = 0;
  };

  return {
    setTarget(next) {
      objetivo = Math.min(1, Math.max(0, next));
      if (reduced() || hidden()) {
        stop();
        actual = objetivo;
        paint(actual);
        return;
      }
      if (!handle) {
        ultimo = 0;
        handle = requestFrame(step);
      }
    },
    reset() {
      stop();
      actual = 0;
      objetivo = 0;
    },
    stop,
    get value() {
      return actual;
    },
    get running() {
      return Boolean(handle);
    },
  };
}
