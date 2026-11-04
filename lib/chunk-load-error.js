/** A failed React.lazy import remains rejected in React/bundler caches.
 * Remounting cannot repair it: offer an explicit reload, never an automatic loop.
 */
export function isChunkLoadError(error) {
  return error?.name === 'ChunkLoadError' || /(?:loading (?:css )?chunk .+ failed|failed to load chunk|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed)/i.test(String(error?.message || ''));
}

export function retryViewError(error, reset) {
  if (isChunkLoadError(error)) {
    window.location.reload();
  } else {
    reset();
  }
}
