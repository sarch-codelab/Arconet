import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync('app/login/login-experience.js', 'utf8');
const css = readFileSync('app/admin/admin-experience.module.css', 'utf8');
describe('/login adaptado al viewport como /admin', () => {
  it('comparte las reglas de tamaño y scroll con admin mediante una clase propia', () => {
    expect(source).toContain('${styles.loginPage} ${styles.clientLoginPage}');
    expect(css).toMatch(/\.clientLoginPage,\s*\.adminLoginPage\s*\{[^}]*height: 100dvh/);
    expect(css).toMatch(/\.clientLoginPage,\s*\.adminLoginPage\s*\{[^}]*overflow: hidden/);
    for (const selector of ['loginCard', 'loginPanel', 'loginPanelBody']) {
      expect(css).toContain(`.clientLoginPage .${selector},\n.adminLoginPage .${selector}`);
    }
    expect(css).toMatch(/\.clientLoginPage \.loginPanelBody,\s*\.adminLoginPage \.loginPanelBody\s*\{[^}]*overflow-y: auto/);
  });
  it('comparte el ajuste con recuperacion y registro como pantallas de acceso de clientes', () => {
    for (const path of ['app/recuperar/recuperar-experience.js', 'app/registro/registro-experience.js']) {
      expect(readFileSync(path, 'utf8')).toContain('${styles.loginPage} ${styles.clientLoginPage}');
    }
    expect(readFileSync('app/registro/registro-experience.js', 'utf8')).not.toContain('<Footer />');
  });
  it('conserva autenticacion, bloqueo de envio, acceso y enlaces', () => {
    for (const value of ['/api/cliente-auth/login', 'if (submitting) return;', 'recordarme: remember', 'disabled={submitting}', 'router.push("/cliente")', 'href="/recuperar"', 'href="/registro"', 'href="/ayuda"', '<MobileSiteMenu floating />']) expect(source).toContain(value);
  });
});
