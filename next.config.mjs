/** @type {import('next').NextConfig} */
// Los chunks llevan hash en el nombre y deploy.ps1 conserva los de los builds
// anteriores (ops/retain-static-assets.mjs). NEXT_DEPLOYMENT_ID añadía el
// sufijo ?dpl=<sha> a TODOS los assets: obligaba a descargarlos de nuevo en
// cada despliegue —justo cuando el único upstream se está reiniciando— y en
// producción un chunk llegó a responderse como 500 text/plain, que el navegador
// rechaza por MIME y termina en ChunkLoadError. Sin ese ID, Next detecta el
// cambio de versión por BUILD_ID y los assets inmutables siguen disponibles.
// Se elimina también por si el entorno del servidor lo heredó de un deploy
// anterior. Ver docs/chunk-500-mime.md.
delete process.env.NEXT_DEPLOYMENT_ID;

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
      // frame-src permite el visor de documentos autenticados en la misma
      // pestaña y el mapa de OpenStreetMap embebido en /contacto (sin clave
      // de API). Se conserva frame-ancestors none en producción.
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob:; frame-src 'self' blob: https://www.openstreetmap.org; connect-src 'self' https://static.cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig = {
  // Solo afecta a `next dev`: permite las vistas previas de Amp y Arena.
  allowedDevOrigins: ["127.0.0.1", "*.onamp.dev", "*.e2b.app"],
  async redirects() {
    // La tienda vive en /tienda. /catalogo es ahora una vitrina propia
    // (app/catalogo/page.js), así que la raíz NO se redirige: las redirecciones
    // se evalúan antes que las rutas y un 301 aquí taparía la página nueva.
    // Solo las URLs antiguas de detalle y de línea conservan su salto 301 para
    // no romper enlaces guardados ni el posicionamiento.
    //
    // OJO: las imágenes del sitio están en `public/catalogo/` y se sirven como
    // /catalogo/algo.jpg. Las redirecciones se evalúan ANTES que los archivos
    // estáticos, así que un `"/catalogo/:path*"` a secas mandaría las fotos a
    // /tienda/... y dejaría la home sin imágenes. Por eso se enumeran solo las
    // rutas que existen de verdad, en vez de usar un comodín general.
    const familias = [
      "soluciones-de-preconectorizado",
      "herrajes",
      "gabinetes-y-racks",
      "cajas-de-distribucion-y-emplazamiento",
      "soluciones-activas-y-accesorios-ftth",
      "herramientas-y-kits",
      "escaleras",
      "optical-distribution-frame-odf",
      "instrumentos-de-medicion-optica",
      "componentes-pasivos",
      "microcables-y-microproductos",
      "infraestructura-de-red",
      "catv-satelite",
      "accesorios-tecnicos",
      "medicion-y-senal",
      "fibra-optica",
    ];
    return [
      // `/catalogo` queda fuera a propósito: es la nueva vitrina.
      { source: "/catalogo/categoria/:slug", destination: "/tienda/categoria/:slug", statusCode: 301 },
      { source: "/catalogo/producto/:slug", destination: "/tienda/producto/:slug", statusCode: 301 },
      ...familias.map((slug) => ({
        source: `/catalogo/${slug}`,
        destination: `/tienda/${slug}`,
        statusCode: 301,
      })),
    ];
  },
  async headers() {
    // Las vistas previas se muestran en un iframe. Mantener el bloqueo de
    // framing en producción, pero permitir la vista embebida en desarrollo.
    const headers = process.env.NODE_ENV === "development"
      ? securityHeaders
          .filter(({ key }) => key !== "X-Frame-Options")
          .map((header) => header.key === "Content-Security-Policy"
            ? { ...header, value: header.value.replace("frame-ancestors 'none'; ", "") }
            : header)
      : securityHeaders;
    // Cloudflare Web Analytics reescribe el HTML en el borde e inyecta
    // beacon.min.js. En las páginas privadas no queremos esa dependencia:
    // no-transform impide la inyección (y el ERR_BLOCKED_BY_CLIENT cuando un
    // bloqueador la detiene), sin cambiar la caché del sitio público/assets.
    //
    // Además del panel, estas pantallas tampoco son públicas: acceso,
    // recuperación, verificación, registro y portal del cliente. Ninguna debe
    // cargar analítica de terceros ni quedar cacheada en el borde.
    const privateHtmlHeaders = [
      { key: "Cache-Control", value: "private, no-store, no-transform" },
    ];
    const privateHtmlRoutes = [
      "/admin/:path*",
      "/panel-administrativo/:path*",
      "/login",
      "/recuperar",
      "/verificar",
      "/registro",
      "/cliente/:path*",
    ];
    return [
      { source: "/(.*)", headers },
      ...privateHtmlRoutes.map((source) => ({ source, headers: privateHtmlHeaders })),
    ];
  },
};

export default nextConfig;