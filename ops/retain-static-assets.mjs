import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Only immutable public assets, never server bundles/manifests or user data. */
export async function retainStaticAssets(source, destination, { now = Date.now(), maxAgeMs = 7 * 86400000 } = {}) {
  if (path.resolve(source) === path.resolve(destination)) throw new Error('Source and destination must differ');
  let copied = 0;
  async function visit(from, to) {
    let entries;
    try { entries = await readdir(from, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const src = path.join(from, entry.name), dst = path.join(to, entry.name);
      if (entry.isDirectory()) { await visit(src, dst); continue; }
      if (!entry.isFile()) continue; // Do not follow symlinks into private directories.
      const info = await stat(src);
      if (now - info.mtimeMs > maxAgeMs) continue;
      await mkdir(to, { recursive: true });
      try { await copyFile(src, dst, constants.COPYFILE_EXCL /* new build wins */); }
      catch (error) { if (error.code === 'EEXIST') continue; throw error; }
      // Preserve original age so retained files expire rather than accumulating forever.
      await utimes(dst, info.atime, info.mtime);
      copied++;
    }
  }
  await visit(source, destination);
  return copied;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: retain-static-assets.mjs OLD_STATIC NEW_STATIC');
  console.log(`Retained ${await retainStaticAssets(source, destination)} previous static assets (7 days).`);
}
