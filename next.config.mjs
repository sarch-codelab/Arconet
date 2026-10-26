/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera=(self): el lector de códigos de barras usa getUserMedia; con
  // camera=() el navegador bloquea la cámara incluso en la propia página.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value:
      // Cloudflare Insights (web analytics / Core Web Vitals) se carga desde
      // static.cloudflareinsights.com: sin este origen en script-src y
      // connect-src el navegador bloquea el beacon y no se registra nada.
      // `media-src 'self' blob:` permite que el video del escáner de códigos
      // de barras (stream de cámara) se pinte dentro de la página; sin él,
      // CSP bloqueaba el <video> y el lector nunca mostraba imagen.
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' https://static.cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig = {
  // Solo afecta a `next dev`: permite abrir el servidor de desarrollo desde
  // los portales de los orbs de Amp.
  allowedDevOrigins: ["*.onamp.dev"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;