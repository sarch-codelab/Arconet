import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = path => readFileSync(path, 'utf8');
const source = read('components/ui/thought-line/thought-line.js');
const chat = read('app/admin/ia-section.js');
describe('ThoughtLine de Monica IA', () => {
  it('utiliza el componente con el estado real de la petición y sin pasos inventados', () => {
    expect(chat).toContain('working={busy} label="Pensando…"');
    expect(chat).not.toContain('Consultando a NVIDIA…');
    expect(chat).not.toContain('steps=');
    expect(chat).toContain('Solicitud finalizada sin respuesta');
  });
  it('mantiene el indicador en la misma posición React al llegar la respuesta', () => {
    expect(chat).toContain('messages.slice(0, thought?.index ?? messages.length)');
    expect(chat).toContain('{thoughtLine}');
    expect(chat).toContain('messages.slice(thought.index)');
    expect(chat).toContain('setThought(null)');
    expect(chat).toContain('id: crypto.randomUUID()');
  });
  it('detiene el reloj y los bucles al terminar o desmontarse', () => {
    expect(source).toContain('if (!isWorking) return undefined');
    expect(source).toContain('clearInterval(id)');
    expect(source).toContain('running.forEach(a => a.stop())');
    expect(source).toContain('ro.disconnect()');
    expect(source).toContain('if (wasWorking.current)');
  });
  it('anuncia estados sin leer el cronómetro cada décima ni generar un botón inerte', () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('{toggle ? (');
    expect(source).toContain('segundos');
  });
  it('mantiene movimiento reducido y estilos móviles contenidos', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('shimmer && !reduce');
    const css = read('components/ui/thought-line/thought-line.css');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain(':focus-visible');
  });
});
