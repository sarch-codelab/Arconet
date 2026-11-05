import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
describe('imagen de contacto relacionada con asesoria en telecomunicaciones', () => {
  const source = readFileSync('app/contacto/contact-experience.js', 'utf8');
  it('usa el recurso local optimizado solo en la portada', () => {
    expect(source).toContain('src="/contacto-asesoria-fibra.webp"');
    expect(source).not.toContain('src="/catalogo/infraestructura.jpg"');
    expect(source).toContain('src="/neto-conducioendo.png"');
    expect(source).toContain('className={styles.heroImage}');
    expect(source).toContain('sizes="100vw"');
    expect(source).toContain('priority');
  });
  it('sirve una imagen WebP horizontal sin peso excesivo', async () => {
    const file = 'public/contacto-asesoria-fibra.webp';
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe('webp');expect(meta.width).toBeGreaterThanOrEqual(1300);
    expect(meta.width / meta.height).toBeGreaterThan(1.7);
    expect(statSync(file).size).toBeLessThan(250000);
  });
});
