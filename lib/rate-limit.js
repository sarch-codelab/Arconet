// In-process fixed-window rate limiter for a single Node instance.
// For multi-instance deployments, replace the store with Redis/Upstash.
const store = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function prune(now) {
  for (const [key, entry] of store) {
    if (entry.reset <= now) store.delete(key);
  }
}

export function checkRateLimit(key, { max = 60, windowMs = 60_000 } = {}) {
  const now = Date.now();
  if (store.size > 10_000) prune(now);

  let entry = store.get(key);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
  }
  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(0, max - entry.count);
  const retryAfter = Math.max(0, Math.ceil((entry.reset - now) / 1000));
  return {
    limited: entry.count > max,
    limit: max,
    remaining,
    reset: Math.floor(entry.reset / 1000),
    retryAfter,
  };
}

export { getClientIp };