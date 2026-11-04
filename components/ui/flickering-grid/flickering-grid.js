// Adapted from Magic UI Flickering Grid by Dillion Verma (MIT); see LICENSE.
// Shared renderer: the site controller runs one throttled loop for visible surfaces.
export function createGrid(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flickering-grid';
  canvas.setAttribute('aria-hidden', 'true');
  const previous = ['position', 'isolation'].map(key => [key, host.style.getPropertyValue(key), host.style.getPropertyPriority(key)]);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.style.isolation = 'isolate';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let cols = 0, rows = 0, squares = new Float32Array(0), width = 0, height = 0;
  return {
    draw(delta, reduced, dark) {
      if (!ctx) return;
      const rect = host.getBoundingClientRect();
      const w = Math.min(1600, Math.ceil(rect.width)), h = Math.min(innerHeight + 32, Math.ceil(rect.height));
      if (w <= 0 || h <= 0) return;
      if (w !== width || h !== height) {
        width = w; height = h; canvas.width = w; canvas.height = h;
        canvas.style.height = `${h}px`;
        cols = Math.ceil(w / 12); rows = Math.ceil(h / 12);
        squares = Float32Array.from({ length: cols * rows }, () => Math.random());
      }
      // Bound memory to a viewport slice, even for very long catalogues.
      canvas.style.transform = `translateY(${Math.max(0, Math.min(-rect.top, rect.height - height))}px)`;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = dark ? '#9baed4' : '#335079';
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < (reduced ? .08 : .3) * delta) squares[i] = Math.random();
        ctx.globalAlpha = squares[i] * (dark ? .13 : .1);
        ctx.fillRect(Math.floor(i / rows) * 12, (i % rows) * 12, 4, 4);
      }
      ctx.globalAlpha = 1;
    },
    remove() {
      canvas.remove();
      previous.forEach(([key, value, priority]) => value ? host.style.setProperty(key, value, priority) : host.style.removeProperty(key));
    },
  };
}
