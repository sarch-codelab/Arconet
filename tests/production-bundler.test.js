import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
it('usa Webpack soportado por Next para produccion, compartido por CI y deploy', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.scripts.build).toBe('prisma generate && next build --webpack');
  expect(pkg.scripts.dev).toBe('prisma generate && next dev');
  expect(readFileSync('deploy.ps1', 'utf8')).toContain("Invoke-Npm -NpmArgs @('run', 'build')");
  expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('npm run build');
});

it('impide promover un build de Turbopack y ofrece un desarrollo alternativo', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  // Turbopack en el navegador puede fallar con «module factory is not available».
  // Producción se queda en Webpack y el despliegue lo verifica antes de servir.
  expect(pkg.scripts['dev:webpack']).toBe('prisma generate && next dev --webpack');
  const deploy = readFileSync('deploy.ps1', 'utf8');
  expect(deploy).toContain('El build promovido usa Turbopack');
  expect(deploy).toContain('/_next/static/chunks/webpack-');
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  expect(ci).toContain('Verificar bundler de producción');
  expect(ci).toContain("find .next/static -iname '*turbopack*'");
});
