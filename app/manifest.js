export default function manifest() {
  return {
    id: "/",
    name: "Arconet | Telecomunicaciones",
    short_name: "Arconet",
    description: "Catálogo, cotizaciones y portal de clientes de Arconet Honduras.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f7f8fa",
    theme_color: "#1544b5",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Portal de clientes", short_name: "Mi cuenta", url: "/login", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Catálogo", short_name: "Catálogo", url: "/catalogo", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
