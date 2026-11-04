import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import CodeSlots, { codeDigits } from '@/components/ui/code-slots/code-slots';
const read = path => readFileSync(path, 'utf8');
describe('CodeSlots de autenticación en dos pasos', () => {
  it.each([['12 34-56', '123456'], ['00a12!34', '001234'], ['123456789','123456'], [null,'']])('normaliza %s conservando ceros iniciales', (raw, expected) => {
    expect(codeDigits(raw)).toBe(expected);
  });
  it('renderiza seis casillas con un único input real apto para autofill y validación nativa', () => {
    const html = renderToStaticMarkup(createElement(CodeSlots, { value: '012345' }));
    expect((html.match(/class="code-slots__slot"/g) || []).length).toBe(6);
    expect((html.match(/<input/g) || []).length).toBe(1);
    expect(html).toContain('value="012345"');
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('pattern="[0-9]{6}"');
    expect(html).toContain('required=""');
  });
  it('solo el éxito del servidor bloquea el código como verificado', () => {
    const html = renderToStaticMarkup(createElement(CodeSlots, { value: '123456', status: 'success' }));
    expect(html).toContain('readOnly=""');
    expect(html).toContain('Código verificado');
    const source = read('app/admin/perfil-section.js');
    expect(source.indexOf('if (!response.ok) throw new Error(data.error || "No se pudo actualizar la autenticación.")')).toBeLessThan(source.indexOf('setCodeStatus("success")'));
  });
  it('tiene estados de error y limpieza cancelable, sin enviar automáticamente formularios', () => {
    const source = read('components/ui/code-slots/code-slots.js');
    expect(source).toContain('clearTimeout(timer)');
    expect(source).toContain('if (completed.current !== code)');
    expect(source).toContain('event.clipboardData.getData');
    expect(source).not.toContain('fetch(');
    for (const path of ['app/admin/login-view.js','app/admin/perfil-section.js','app/admin/acceso-qr/approve-view.js']) {
      expect(read(path)).toContain('<CodeSlots');
      expect(read(path)).not.toContain('onComplete=');
    }
  });
  it('adapta temas, ancho móvil y movimiento reducido sin ocultar el input accesible', () => {
    const css = read('components/ui/code-slots/code-slots.css');
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain('minmax(0, 1fr)');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('forced-colors: active');
    expect(css).not.toContain('display: none');
  });
});
