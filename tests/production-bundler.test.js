import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
it('usa Webpack soportado por Next para produccion, compartido por CI y deploy', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.scripts.build).toBe('prisma generate && next build --webpack');
  expect(pkg.scripts.dev).toBe('prisma generate && next dev');
  expect(readFileSync('deploy.ps1', 'utf8')).toContain("Invoke-Npm -NpmArgs @('run', 'build')");
  expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('npm run build');
});
