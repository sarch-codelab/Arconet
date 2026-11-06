import { describe, expect, it } from "vitest";
import { createSlideEasing } from "../lib/slide-easing";

// RAF falso: permite recorrer el bucle completo sin navegador y sin timers.
function marco() {
  let now = 0;
  let siguiente = 1;
  const pendientes = new Map();
  return {
    requestFrame(fn) {
      const id = siguiente++;
      pendientes.set(id, fn);
      return id;
    },
    cancelFrame(id) {
      pendientes.delete(id);
    },
    avanzar(dt = 16) {
      const lote = [...pendientes.values()];
      pendientes.clear();
      now += dt;
      lote.forEach((fn) => fn(now));
      return pendientes.size;
    },
    get pendientes() {
      return pendientes.size;
    },
  };
}

const crear = (extra = {}) => {
  const clock = marco();
  const pintados = [];
  const easing = createSlideEasing({
    paint: (valor) => pintados.push(valor),
    requestFrame: clock.requestFrame,
    cancelFrame: clock.cancelFrame,
    ...extra,
  });
  return { clock, pintados, easing };
};

const converger = (clock, limite = 200) => {
  let vueltas = 0;
  while (clock.pendientes && vueltas < limite) {
    clock.avanzar();
    vueltas += 1;
  }
  return vueltas;
};

describe("suavizado del recorrido horizontal de Soluciones", () => {
  it("interpola el salto de la rueda en vez de copiarlo de golpe", () => {
    const { clock, pintados, easing } = crear();
    easing.setTarget(1);
    expect(easing.running).toBe(true);
    expect(pintados).toHaveLength(0); // No pinta sincronizado con el evento.

    const vueltas = converger(clock);
    expect(vueltas).toBeGreaterThan(3);
    expect(pintados[0]).toBeGreaterThan(0);
    expect(pintados[0]).toBeLessThan(0.5);
    expect(pintados.at(-1)).toBe(1);
    for (let i = 1; i < pintados.length; i += 1) {
      expect(pintados[i]).toBeGreaterThanOrEqual(pintados[i - 1]);
    }
  });

  it("apaga el RAF al llegar al objetivo: no queda bucle en reposo", () => {
    const { clock, easing } = crear();
    easing.setTarget(0.6);
    converger(clock);
    expect(easing.running).toBe(false);
    expect(clock.pendientes).toBe(0);
    expect(easing.value).toBe(0.6);

    // Un scroll que no cambia el progreso no reanima ningún bucle.
    easing.setTarget(0.6);
    expect(clock.avanzar()).toBe(0);
    expect(easing.running).toBe(false);
  });

  it("con movimiento reducido o pestaña oculta aplica el valor sin animar", () => {
    const reducido = crear({ reduced: () => true });
    reducido.easing.setTarget(0.72);
    expect(reducido.pintados).toEqual([0.72]);
    expect(reducido.clock.pendientes).toBe(0);

    const oculto = crear({ hidden: () => true });
    oculto.easing.setTarget(0.4);
    expect(oculto.pintados).toEqual([0.4]);
    expect(oculto.easing.running).toBe(false);
  });

  it("admite un objetivo nuevo sin encadenar un segundo bucle", () => {
    const { clock, easing } = crear();
    easing.setTarget(1);
    clock.avanzar();
    expect(easing.value).toBeGreaterThan(0);
    easing.setTarget(0.25);
    expect(clock.pendientes).toBe(1);
    converger(clock);
    expect(easing.value).toBe(0.25);
    expect(clock.pendientes).toBe(0);
  });

  it("acota el progreso, tolera fotogramas largos y cancela al resetear", () => {
    const { clock, pintados, easing } = crear();
    easing.setTarget(4);
    easing.setTarget(-3);
    clock.avanzar(5000); // El delta se limita a 64 ms, no salta de golpe.
    expect(pintados[0]).toBe(0);
    expect(easing.value).toBe(0);

    easing.setTarget(1);
    clock.avanzar();
    easing.reset();
    expect(easing.value).toBe(0);
    expect(easing.running).toBe(false);
    expect(clock.pendientes).toBe(0);
  });
});
