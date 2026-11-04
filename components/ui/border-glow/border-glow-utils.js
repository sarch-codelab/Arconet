// Adapted from React Bits BorderGlow (MIT + Commons Clause); see LICENSE.
const POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const KEYS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];
export const DEFAULT_COLORS = ['#c084fc', '#f472b6', '#38bdf8'];
const clamp = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback;
export function buildGlowVars({ glowColor = '250 85 78', glowIntensity = 1, colors = DEFAULT_COLORS,
  edgeSensitivity = 30, glowRadius = 24, coneSpread = 25, fillOpacity = 0 } = {}) {
  const parts = String(glowColor).trim().split(/\s+/).map(n => parseFloat(n));
  const [h, s, l] = parts.length === 3 && parts.every(Number.isFinite) ? parts : [250, 85, 78];
  const base = `${((h % 360) + 360) % 360}deg ${clamp(s, 0, 100, 85)}% ${clamp(l, 0, 100, 78)}%`;
  const intensity = clamp(glowIntensity, 0.1, 3, 1);
  const palette = Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;
  const vars = {
    '--bg-edge-sensitivity': clamp(edgeSensitivity, 0, 99, 30), '--bg-cone-spread': clamp(coneSpread, 5, 45, 25),
    '--bg-glow-radius': `${clamp(glowRadius, 0, 40, 24)}px`, '--bg-fill-opacity': clamp(fillOpacity, 0, 0.5, 0),
  };
  [100, 60, 50, 40, 30, 20, 10].forEach(opacity => {
    vars[`--bg-glow-${opacity}`] = `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`;
  });
  POSITIONS.forEach((position, i) => {
    vars[`--bg-gradient-${KEYS[i]}`] = `radial-gradient(at ${position}, ${palette[COLOR_MAP[i] % palette.length]} 0px, transparent 50%)`;
  });
  vars['--bg-gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`;
  return vars;
}
export function pointerGlowValues(rect, clientX, clientY) {
  const cx = rect.width / 2, cy = rect.height / 2;
  if (cx <= 0 || cy <= 0) return { proximity: 0, angle: 0 };
  const dx = clientX - rect.left - cx, dy = clientY - rect.top - cy;
  return { proximity: Math.min(1, Math.max(Math.abs(dx) / cx, Math.abs(dy) / cy)) * 100,
    angle: (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360 };
}
export function paintGlow(card, proximity, angle = 0) {
  card.style.setProperty('--bg-edge-proximity', String(proximity));
  card.style.setProperty('--bg-cursor-angle', `${angle}deg`);
}
export function decorateGlow(card, options) {
  const previous = new Map();
  const vars = buildGlowVars(options);
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, [card.style.getPropertyValue(key), card.style.getPropertyPriority(key)]);
    card.style.setProperty(key, value);
  }
  for (const key of ['--bg-edge-proximity', '--bg-cursor-angle']) previous.set(key, [card.style.getPropertyValue(key), card.style.getPropertyPriority(key)]);
  const position = card.style.getPropertyValue('position');
  const priority = card.style.getPropertyPriority('position');
  const positioned = getComputedStyle(card).position === 'static';
  if (positioned) card.style.position = 'relative';
  const layer = document.createElement('span');
  layer.className = 'border-glow-effect';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<span class="border-glow-effect__mesh"></span><span class="border-glow-effect__fill"></span><span class="border-glow-effect__light"></span>';
  card.appendChild(layer);
  return () => {
    layer.remove();
    previous.forEach(([value, important], key) => value ? card.style.setProperty(key, value, important) : card.style.removeProperty(key));
    if (positioned && card.style.position === 'relative') {
      if (position) card.style.setProperty('position', position, priority); else card.style.removeProperty('position');
    }
  };
}
