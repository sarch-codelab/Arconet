import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Comprueba que el build contiene los archivos que el HTML va a pedir.
 *
 * El incidente de /admin fue un chunk `app/admin/page-*.js` que el servidor
 * devolvió como 500 text/plain: el navegador rechazó ejecutarlo y Webpack
 * lanzó ChunkLoadError. `Assert-Healthy` sólo pedía UN chunk de la home, así
 * que un chunk de otra ruta podía estar ausente o corrupto sin detener el
 * despliegue.
 *
 * Esta verificación corre sobre el build ANTES de promoverlo (deploy.ps1) y
 * en CI. No sustituye la comprobación HTTP posterior: aquí se valida el disco,
 * allí se valida lo que realmente sirve el servidor cabeceras incluidas.
 */
async function collect(root, suffix, acc = []) {
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return acc; throw error; }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) await collect(full, suffix, acc);
    else if (entry.isFile() && entry.name.endsWith(suffix)) acc.push(full);
  }
  return acc;
}

const ASSET_RE = /\/_next\/static\/[^"<> ]+?\.(?:js|css)(?:\?[^"<> ]*)?/g;

export async function verifyStaticAssets({ root = process.cwd() } = {}) {
  const staticRoot = path.join(root, '.next', 'static');
  const htmlFiles = await collect(path.join(root, '.next', 'server', 'app'), '.html');
  if (!htmlFiles.length) throw new Error('No hay HTML prerenderizado en .next/server/app');

  const referenced = new Set();
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(ASSET_RE)) {
      referenced.add(match[0].split('?')[0]);
    }
  }
  if (!referenced.size) throw new Error('El HTML prerenderizado no referencia assets de /_next/static');

  const missing = [];
  const raizEstatica = path.resolve(staticRoot);
  for (const url of referenced) {
    // Next codifica los segmentos dinámicos en la URL del chunk: el HTML pide
    // `.../ficha/%5Bslug%5D/page-*.js`, pero en disco está en
    // `.../ficha/[slug]/page-*.js`. Sin decodificar, una build correcta con
    // rutas SSG dinámicas pareciera tener un chunk ausente y el despliegue se
    // detendría. Se decodifica con cuidado para no salir de .next/static.
    let relativa;
    try {
      relativa = decodeURIComponent(url.replace(/^\/_next\/static\//, ''));
    } catch {
      missing.push(url);
      continue;
    }
    const file = path.resolve(raizEstatica, relativa);
    if (!file.startsWith(`${raizEstatica}${path.sep}`)) {
      missing.push(url);
      continue;
    }
    try {
      const info = await stat(file);
      if (!info.isFile() || info.size === 0) missing.push(url);
    } catch { missing.push(url); }
  }
  if (missing.length) {
    throw new Error(`Assets referenciados ausentes o vacíos (${missing.length}): ${missing.slice(0, 5).join(', ')}`);
  }

  // /admin se renderiza bajo demanda: su chunk NO aparece en el HTML
  // prerenderizado, pero es justo el que falló en producción.
  const adminDir = path.join(staticRoot, 'chunks', 'app', 'admin');
  const adminFiles = await collect(adminDir, '.js');
  if (!adminFiles.some((file) => /^page-.*\.js$/.test(path.basename(file)))) {
    throw new Error('Falta el chunk JavaScript de la página /admin');
  }

  return { html: htmlFiles.length, assets: referenced.size, admin: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyStaticAssets({ root: process.cwd() })
    .then(({ html, assets }) => console.log(`Static assets OK: ${html} HTML, ${assets} assets referenciados y chunk de /admin presente.`))
    .catch((error) => { console.error(`Static assets FAIL: ${error.message}`); process.exit(1); });
}
