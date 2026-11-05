import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import QrLogin from '../app/admin/qr-login';

describe('acceso QR dentro de la tarjeta existente', () => {
  const source = readFileSync('app/admin/qr-login.js', 'utf8');
  const css = readFileSync('app/admin/qr-login.module.css', 'utf8');
  const loginCss = readFileSync('app/admin/admin-experience.module.css', 'utf8');
  it('solo muestra el disparador al inicio, sin generar desafios al renderizar', () => {
    const html = renderToStaticMarkup(createElement(QrLogin));
    expect(html).toContain('Acceso rápido con QR');
    expect(html).not.toContain('Generando QR');
    expect(html).not.toContain('QR para aprobar');
    expect(html).not.toContain('<h3');
  });
  it('bloquea el disparador mientras se envia el acceso con contraseña', () => {
    expect(renderToStaticMarkup(createElement(QrLogin, { disabled: true }))).toContain('disabled=""');
    expect(source).toContain('if (disabled) return;');
  });
  it('reserva el espacio original y superpone QR sin altura adicional ni scroll anchoring', () => {
    expect(css).toContain('.open > .trigger { visibility: hidden;');
    expect(css).toContain('.panel { position: absolute; inset: 0;');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('justify-content: safe center');
    expect(loginCss).toContain('overflow-anchor: none');
    expect(loginCss).toContain('.loginCredentialsHidden {\n  visibility: hidden;');
  });
  it('devuelve el foco sin mover la pagina y permite cerrar con Escape', () => {
    expect(source).toContain('headingRef.current?.focus({ preventScroll: true })');
    expect(source).toContain('triggerRef.current?.focus({ preventScroll: true })');
    expect(source).toContain('open && status === "creating"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('onOpenChange?.(false)');
  });
  it('conserva cancelacion y limpieza de polling/generacion', () => {
    expect(source).toContain('action: "cancel"');
    expect(source).toContain('creating.current?.abort()');
    expect(source).toContain('window.clearTimeout(pollTimer)');
    expect(source).toContain('window.clearInterval(ticker)');
    expect(source).toContain('Escanear no inicia sesión: debes aprobar en el teléfono.');
  });
});
