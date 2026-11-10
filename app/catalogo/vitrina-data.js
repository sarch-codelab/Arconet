// Contenido editorial de la vitrina /catalogo.
//
// La página es una reinterpretación del diseño de referencia con marca Arconet:
// las líneas, los textos y los equipos son de telecomunicaciones. Aquí NO se
// muestran precios ni controles de compra: la cotización real se hace en
// /tienda. Los 6 «Productos destacados» abren su ficha editorial en
// /catalogo/ficha/[slug] (ver ficha-data.js); el resto de las tarjetas sigue
// enlazando a líneas reales de /tienda para no dejar enlaces muertos.

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

export const HERO_IMAGE = "/catalogo-vitrina/hero-banner.jpg";

export const HERO_SLIDES = [
  {
    image: HERO_IMAGE,
    imageAlt: "Equipos de fibra óptica e instrumentos de medición",
    eyebrow: "Descubre. Equipa. Conecta.",
    title: "Última tecnología",
    accent: "en redes",
    text: "Fibra óptica, instrumentos y todo lo que tu instalación necesita, en un solo lugar.",
    cta: "Ver catálogo",
    href: "/tienda#catalogo-items",
    badge: "Novedades",
  },
  {
    image: "/catalogo-vitrina/hero-medicion.jpg",
    imageAlt: "Instrumentos de medición óptica y cable de fibra",
    eyebrow: "Precisión que se mide.",
    title: "Instrumentos",
    accent: "para campo",
    text: "OTDR, fusionadoras y medidores calibrados para certificar cada enlace que entregas.",
    cta: "Ver instrumentos",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    badge: "Medición",
  },
  {
    image: "/catalogo-vitrina/hero-ftth.jpg",
    imageAlt: "Cables, conectores y cajas de distribución de fibra óptica",
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
    href: "/catalogo/ficha/fusionadora",
    offer: false,
  },
  {
    id: "otdr",
    name: "OTDR de campo 1310/1550 nm",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    image: "/catalogo/prod-otdr.jpg",
    href: "/catalogo/ficha/otdr",
    offer: true,
  },
  {
    id: "powermeter",
    name: "Medidor de potencia óptica",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    image: "/catalogo/prod-powermeter.jpg",
    href: "/catalogo/ficha/powermeter",
    offer: false,
  },
  {
    id: "gabinete",
    name: "Gabinete de distribución 24 puertos",
    line: "Gabinetes y Racks",
    category: "gabinetes",
    image: "/catalogo/prod-gabinete.jpg",
    href: "/catalogo/ficha/gabinete",
    offer: true,
  },
  {
    id: "kit-herramientas",
    name: "Kit de herramientas FTTH",
    line: "Herramientas y kits",
    category: "herramientas",
    image: "/catalogo/prod-herramientas.jpg",
    href: "/catalogo/ficha/kit-herramientas",
    offer: false,
  },
  {
    id: "cable-adss",
    name: "Cable ADSS 24 hilos",
    line: "Componentes pasivos",
    category: "fibra",
    image: "/catalogo/prod-adss.jpg",
    href: "/catalogo/ficha/cable-adss",
    offer: false,
  },
];

// Vitrina de ofertas y líneas destacadas: solo se señalan como ofertas los
// equipos que ya tienen esa etiqueta en PRODUCTS. Las demás tarjetas llevan a
// categorías reales o a contacto, sin prometer promociones no configuradas.
export const DEAL_CARDS = [
  { title: "OTDR de campo", detail: "En oferta", href: "/catalogo/ficha/otdr", image: "/catalogo-vitrina/ofertas/medalla-descuento.webp" },
  { title: "Instrumentos de medición", detail: "Explorar equipos", href: "/tienda/categoria/instrumentos-de-medicion-optica", icon: "gauge", accent: true },
  { title: "Fibra óptica", detail: "Conecta tus proyectos", href: "/tienda/categoria/soluciones-de-preconectorizado", image: "/catalogo-vitrina/ofertas/bobina-fibra.webp", featured: true },
  { title: "Componentes pasivos", detail: "Para tu red", href: "/tienda/categoria/componentes-pasivos", icon: "cable" },
  { title: "Gabinete de distribución", detail: "En oferta", href: "/catalogo/ficha/gabinete", image: "/catalogo-vitrina/ofertas/medalla-descuento.webp" },
  { title: "Herramientas y kits", detail: "Para cada instalación", href: "/tienda/categoria/herramientas-y-kits", icon: "wrench" },
  { title: "Cotiza tu proyecto", detail: "Hablemos de tu red", href: "/contacto", icon: "boxes" },
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
  { title: "Conectores para fibra", count: "Explorar soluciones", image: "/catalogo-vitrina/ideas/fibra-conectores.jpg", href: "/tienda/categoria/soluciones-de-preconectorizado" },
  { title: "Centros de datos", count: "Explorar gabinetes", image: "/catalogo-vitrina/ideas/conexion-servidor.jpg", href: "/tienda/categoria/gabinetes-y-racks" },
  { title: "Cableado de red", count: "Explorar componentes", image: "/catalogo-vitrina/ideas/cableado-red.jpg", href: "/tienda/categoria/componentes-pasivos" },
  { title: "Distribución óptica", count: "Explorar soluciones", image: "/catalogo/lineas/odf.webp", href: "/tienda/categoria/optical-distribution-frame-odf" },
  { title: "Cajas de distribución", count: "Explorar soluciones", image: "/catalogo/lineas/cajas.webp", href: "/tienda/categoria/cajas-de-distribucion-y-emplazamiento" },
  { title: "Montaje y herrajes", count: "Explorar equipos", image: "/catalogo/lineas/herrajes.webp", href: "/tienda/categoria/herrajes" },
  { title: "Redes activas FTTH", count: "Explorar equipos", image: "/catalogo/lineas/activas.webp", href: "/tienda/categoria/soluciones-activas-y-accesorios-ftth" },
];

export const PROMISES = [
  { icon: "badge", title: "100% original", text: "Importación directa" },
  { icon: "sparkles", title: "Recomendado por técnicos", text: "Instaladores de todo el país" },
  { icon: "star", title: "Líneas mejor valoradas", text: "Calidad que se mide en campo" },
  { icon: "percent", title: "Mejor precio", text: "Cotiza antes de comprar" },
];

// Vitrina de fabricantes para el bloque que va debajo de «Productos
// destacados». Son los MISMOS fabricantes y logotipos que ya usa la home en
// app/home-marcas.js: no se inventan alianzas ni se descargan logos nuevos de
// terceros. PBI y Belden no tienen archivo y se muestran como wordmark.
// Los enlaces llevan a la línea del catálogo más afín a cada fabricante.
export const BRANDS = [
  {
    name: "FiberHome",
    logo: "/marcas/fiberhome.png",
    href: "/tienda/categoria/soluciones-de-preconectorizado",
  },
  {
    name: "Sumitomo",
    logo: "/marcas/sumitomo.png",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
  },
  {
    name: "Lindsay",
    logo: "/marcas/lindsay.png",
    href: "/tienda/categoria/componentes-pasivos",
  },
  {
    name: "Joinwit",
    logo: "/marcas/joinwit.png",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
  },
  { name: "PBI", logo: "", href: "/tienda" },
  {
    name: "Belden",
    logo: "",
    href: "/tienda/categoria/componentes-pasivos",
  },
];

export const SOBRE_NOVEDADES = "/catalogo-vitrina/sobre-novedades.webp";
export const REGALO_OFERTAS = "/catalogo-vitrina/regalo-ofertas.webp";
