import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { isChunkLoadError, retryViewError } from '@/lib/chunk-load-error';
import { SectionErrorBoundary } from '@/app/admin/error-boundary';

afterEach(() => vi.unstubAllGlobals());
describe('Recuperacion de chunks', () => {
  it.each([
    { name: 'ChunkLoadError', message: 'Missing chunk' },
    new Error('Failed to load chunk /_next/static/chunks/320-rjw1nc4qd.js from module 727158'),
    new Error('Loading chunk 42 failed.'),
    new Error('Module 71645 was instantiated because it was required from module 56420, but the module factory is not available.'),
    new Error('Loading CSS chunk 42 failed.'),
    new Error('Failed to fetch dynamically imported module: https://arconethn.com/a.js'),
    new Error('error loading dynamically imported module'),
    new Error('Importing a module script failed.'),
  ])('reconoce un import fallido: %s', error => expect(isChunkLoadError(error)).toBe(true));
  it.each([null, {}, new Error('HTTP 502'), new Error('Validation failed'), new Error('module factory business rule failed'), new Error('Cannot read properties of undefined')])('no confunde errores de API/render con chunks: %s', error => expect(isChunkLoadError(error)).toBe(false));
  it('solo recarga por una accion explicita y no reintenta el lazy rechazado', () => {
    const reload = vi.fn(), reset = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const error = new Error('Failed to load chunk /_next/static/chunks/fail.js');
    expect(isChunkLoadError(error)).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    retryViewError(error, reset);
    expect(reload).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
    retryViewError(new Error('Render failed'), reset);
    expect(reset).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });
  it('el panel distingue recarga de remonte y advierte de cambios sin guardar', () => {
    const boundary = new SectionErrorBoundary({ label: 'Ventas' });
    boundary.state = { error: new Error('Failed to load chunk /_next/static/chunks/a.js') };
    const html = renderToStaticMarkup(boundary.render());
    expect(html).toContain('Recargar página');
    expect(html).toContain('no hayas guardado');
    expect(html).not.toContain('>Reintentar<');
    boundary.state = { error: new Error('Dato inesperado') };
    expect(renderToStaticMarkup(boundary.render())).toContain('>Reintentar<');
  });
  it('recupera la fabrica ausente con recarga explicita, no con remonte', () => {
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const boundary = new SectionErrorBoundary({ label: 'Ventas' });
    boundary.state = { error: new Error('Module 71645 was instantiated because it was required from module 56420, but the module factory is not available.') };
    expect(renderToStaticMarkup(boundary.render())).toContain('Recargar página');
    expect(reload).not.toHaveBeenCalled();
    boundary.reset();
    expect(reload).toHaveBeenCalledOnce();
  });
  it('no cambia las secciones sanas', () => {
    const html = renderToStaticMarkup(createElement(SectionErrorBoundary, { label: 'Ventas' }, createElement('p', null, 'Contenido')));
    expect(html).toContain('Contenido');
    expect(html).not.toContain('Recargar');
  });
});
