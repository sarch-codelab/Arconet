import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('admin sin scroll de pagina', () => {
 const css = readFileSync('app/admin/admin-experience.module.css', 'utf8');
 const source = readFileSync('app/admin/login-view.js', 'utf8');
 it('limita solo el acceso administrativo al viewport dinamico', () => {
  expect(source).toContain('${styles.loginPage} ${styles.adminLoginPage}');
  const rule = css.match(/\.adminLoginPage\s*\{([^}]+)\}/)[1];
  expect(rule).toContain('height: 100dvh');expect(rule).toContain('min-height: 0');expect(rule).toContain('overflow: hidden');
  for (const path of ['app/login/login-experience.js','app/recuperar/recuperar-experience.js']) expect(readFileSync(path,'utf8')).not.toContain('styles.adminLoginPage');
 });
 it('contiene la tarjeta y ofrece scroll interno para ventanas bajas y zoom', () => {
  expect(css).toMatch(/\.adminLoginPage \.loginCard\s*\{[^}]*max-height: 100%/);
  expect(css).toMatch(/\.adminLoginPage \.loginPanelBody\s*\{[^}]*overflow-y: auto/);
  expect(css).toContain('@media (max-height: 600px)');
 });
 it('compacta QR solo en este contexto sin cambiar aprobacion/autenticacion', () => {
  expect(source).toContain('disabled={submitting} fitViewport');
  expect(source).toContain('bodyRef.current.scrollTop = qrOpen ? 0 : credentialScroll.current');
  expect(css).toContain('.loginPanelBody[data-qr-open] { overflow-y: hidden; }');
  expect(readFileSync('app/admin/qr-login.js','utf8')).toContain('data-fit-viewport={fitViewport || undefined}');
  expect(readFileSync('app/admin/qr-login.module.css','utf8')).toContain('.root[data-fit-viewport] .panel');
 });
});
