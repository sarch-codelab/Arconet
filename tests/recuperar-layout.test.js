import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../app/mobile-site-menu', () => ({ default: () => null }));
vi.mock('../app/toaster', () => ({ sileo: { success: vi.fn(), error: vi.fn() } }));
import RecuperarExperience from '../app/recuperar/recuperar-experience';
const source = readFileSync('app/recuperar/recuperar-experience.js', 'utf8');
const html = renderToStaticMarkup(createElement(RecuperarExperience));
describe('recuperacion coherente con login', () => {
  it('usa la misma tarjeta, fondo, logo y boton del login en vez del panel visual obsoleto', () => {
    expect(source).toContain('import styles from "../admin/admin-experience.module.css"');
    for (const name of ['loginPage', 'loginCard', 'loginPanel', 'loginPanelBody', 'loginBrand', 'clientLoginSubmit']) expect(source).toContain(`styles.${name}`);
    for (const old of ['loginVisual', 'logoTab', 'infraestructura.jpg', '<Footer', 'import Image']) expect(source).not.toContain(old);
    expect(html).toContain('src="/arconet.png"'); expect(html).toContain('alt="Arconet"');
    expect(html).not.toContain('Vuelve a tus proyectos');
  });
  it('mantiene formulario, pasos, enlaces y endpoints de recuperacion', () => {
    for (const value of ['Correo electrónico', 'Enviar código', 'Pasos de la recuperación', 'aria-current="step"', 'href="/login"', 'href="/registro"', 'href="/privacidad"']) expect(html).toContain(value);
    for (const value of ['/api/cuenta/recuperar', '/api/cuenta/restablecer', 'validarPassword(password)', 'autoComplete="one-time-code"', 'Enviar otro código', 'setStep("listo")']) expect(source).toContain(value);
  });
  it('conserva la proteccion ante doble envio, confirmacion y mensajes de error', () => {
    expect(source.match(/if \(submitting\) return;/g)).toHaveLength(2);
    expect(source).toContain('password !== confirmar'); expect(source).toContain('role="alert"');
    expect(source).toContain('disabled={submitting}');
  });
});
