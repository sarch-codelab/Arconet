// Contenido editorial de la vitrina /catalogo.
//
// La página es una reinterpretación del diseño de referencia con marca Arconet:
// las líneas, los textos y los equipos son de telecomunicaciones. No se
// muestran precios: la cotización real se hace en /tienda, y CADA tarjeta
// enlaza a una línea real del catálogo para no dejar enlaces muertos.

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Soluciones", href: "/#soluciones" },
  { label: "Tienda", href: "/tienda" },
];

export const CHIPS = [
  { id: "todas", label: "Todas", icon: "grid" },
  { id: "fibra", label: "Fibra óptica", icon: "cable" },
  { id: "pasivos", label: "Componentes pasivos", icon: "boxes" },
  { id: "medicion", label: "Instrumentos", icon: "gauge" },
  { id: "gabinetes", label: "Gabinetes y Racks", icon: "server" },
  { id: "herramientas", label: "Herramientas", icon: "wrench" },
  { id: "ofertas", label: "Ofertas", icon: "percent" },
];

export const HERO_SLIDES = [
  {
    eyebrow: "Descubre. Equipa. Conecta.",
    title: "Última tecnología",
    accent: "en redes",
    text: "Fibra óptica, instrumentos y todo lo que tu instalación necesita, en un solo lugar.",
    cta: "Ver catálogo",
    href: "/tienda#catalogo-items",
    badge: "Novedades",
  },
  {
    eyebrow: "Precisión que se mide.",
    title: "Instrumentos",
    accent: "para campo",
    text: "OTDR, fusionadoras y medidores calibrados para certificar cada enlace que entregas.",
    cta: "Ver instrumentos",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    badge: "Medición",
  },
  {
    eyebrow: "Listo para instalar.",
    title: "Soluciones",
    accent: "preconectorizadas",
    text: "Menos tiempo en campo, menos empalmes y una red que queda bien a la primera.",
    cta: "Ver soluciones",
    href: "/tienda/categoria/soluciones-de-preconectorizado",
    badge: "FTTH",
  },
];

// Cuadrícula de categorías: foto de fondo + etiqueta, inspirada en el
// "Featured Category Grid" de la referencia. Las fotos son de stock libre
// (Pexels / Unsplash) y los enlaces apuntan a líneas reales de /tienda.
export const CATEGORY_CARDS = [
  {
    title: "Fibra óptica",
    tint: "#1e63c8",
    image: "/catalogo-vitrina/categorias/fibra-optica.webp",
    href: "/tienda/categoria/soluciones-de-preconectorizado",
  },
  {
    title: "Componentes pasivos",
    tint: "#14867c",
    image: "/catalogo-vitrina/categorias/componentes-pasivos.webp",
    href: "/tienda/categoria/componentes-pasivos",
  },
  {
    title: "Instrumentos",
    tint: "#b8622a",
    image: "/catalogo-vitrina/categorias/instrumentos.webp",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
  },
  {
    title: "Gabinetes y Racks",
    tint: "#28528f",
    image: "/catalogo-vitrina/categorias/gabinetes-racks.webp",
    href: "/tienda/categoria/gabinetes-y-racks",
  },
  {
    title: "Herramientas",
    tint: "#7b4aa6",
    image: "/catalogo-vitrina/categorias/herramientas.webp",
    href: "/tienda/categoria/herramientas-y-kits",
  },
  {
    title: "Ofertas",
    tint: "#1544b5",
    image: "/catalogo-vitrina/categorias/ofertas.webp",
    href: "/tienda",
    featured: true,
  },
];

export const PRODUCTS = [
  {
    id: "fusionadora",
    name: "Fusionadora de fibra óptica",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    image: "/catalogo/prod-fusionadora.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: false,
  },
  {
    id: "otdr",
    name: "OTDR de campo 1310/1550 nm",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    image: "/catalogo/prod-otdr.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: true,
  },
  {
    id: "powermeter",
    name: "Medidor de potencia óptica",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    image: "/catalogo/prod-powermeter.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: false,
  },
  {
    id: "gabinete",
    name: "Gabinete de distribución 24 puertos",
    line: "Gabinetes y Racks",
    category: "gabinetes",
    image: "/catalogo/prod-gabinete.jpg",
    href: "/tienda/categoria/gabinetes-y-racks",
    offer: true,
  },
  {
    id: "kit-herramientas",
    name: "Kit de herramientas FTTH",
    line: "Herramientas y kits",
    category: "herramientas",
    image: "/catalogo/prod-herramientas.jpg",
    href: "/tienda/categoria/herramientas-y-kits",
    offer: false,
  },
  {
    id: "cable-adss",
    name: "Cable ADSS 24 hilos",
    line: "Componentes pasivos",
    category: "fibra",
    image: "/catalogo/prod-adss.jpg",
    href: "/tienda/categoria/componentes-pasivos",
    offer: false,
  },
];

export const BENEFITS = [
  { icon: "truck", title: "Envíos a todo Honduras", text: "San Pedro Sula y todo el país" },
  { icon: "shield", title: "Pagos seguros", text: "Facturación y cotización clara" },
  { icon: "rotate", title: "Garantía y devoluciones", text: "Respaldo en cada equipo" },
  { icon: "headphones", title: "Soporte técnico", text: "Te atiende una persona del equipo" },
];

export const IDEAS = [
  { title: "Instalaciones FTTH", count: "129 ideas", image: "/catalogo/sol-fibra.jpg", href: "/tienda/categoria/soluciones-de-preconectorizado" },
  { title: "Kit del instalador", count: "96 ideas", image: "/catalogo/sol-redes.jpg", href: "/tienda/categoria/herramientas-y-kits" },
  { title: "Gabinetes y racks", count: "74 ideas", image: "/catalogo/infraestructura.jpg", href: "/tienda/categoria/gabinetes-y-racks" },
  { title: "Medición óptica", count: "155 ideas", image: "/catalogo/sol-medicion.jpg", href: "/tienda/categoria/instrumentos-de-medicion-optica" },
  { title: "Redes empresariales", count: "87 ideas", image: "/catalogo/hero-fiber.jpg", href: "/tienda" },
];

export const PROMISES = [
  { icon: "badge", title: "100% original", text: "Importación directa" },
  { icon: "sparkles", title: "Recomendado por técnicos", text: "Instaladores de todo el país" },
  { icon: "star", title: "Líneas mejor valoradas", text: "Calidad que se mide en campo" },
  { icon: "percent", title: "Mejor precio", text: "Cotiza antes de comprar" },
];

export const HERO_IMAGE = "/catalogo-vitrina/hero-banner.jpg";
export const SOBRE_NOVEDADES = "/catalogo-vitrina/sobre-novedades.webp";
export const REGALO_OFERTAS = "/catalogo-vitrina/regalo-ofertas.webp";
