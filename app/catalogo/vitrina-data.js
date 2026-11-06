// Contenido editorial de la vitrina /catalogo.
//
// La página es una reinterpretación del diseño de referencia con marca Arconet:
// las líneas, los textos y los equipos son de telecomunicaciones. Los precios
// son ilustrativos (la cotización real se hace en /tienda) y CADA tarjeta
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

export const CATEGORY_CARDS = [
  {
    title: "Fibra óptica",
    subtitle: "Conecta. Mide. Entrega.",
    image: "/catalogo/lineas/cards/preconectorizado.webp",
    href: "/tienda/categoria/soluciones-de-preconectorizado",
    icon: "cable",
  },
  {
    title: "Componentes pasivos",
    subtitle: "Splitters y adaptadores.",
    image: "/catalogo/lineas/cards/pasivos.webp",
    href: "/tienda/categoria/componentes-pasivos",
    icon: "boxes",
  },
  {
    title: "Instrumentos",
    subtitle: "Precisión en campo.",
    image: "/catalogo/lineas/cards/medicion.webp",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    icon: "gauge",
  },
  {
    title: "Gabinetes y Racks",
    subtitle: "Ordena tu red.",
    image: "/catalogo/lineas/cards/gabinetes.webp",
    href: "/tienda/categoria/gabinetes-y-racks",
    icon: "server",
  },
  {
    title: "Herramientas",
    subtitle: "Listos para instalar.",
    image: "/catalogo/lineas/cards/herramientas.webp",
    href: "/tienda/categoria/herramientas-y-kits",
    icon: "wrench",
  },
];

export const PRODUCTS = [
  {
    id: "fusionadora",
    name: "Fusionadora de fibra óptica",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    price: "L 42,800.00",
    likes: 2100,
    image: "/catalogo/prod-fusionadora.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: false,
  },
  {
    id: "otdr",
    name: "OTDR de campo 1310/1550 nm",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    price: "L 36,500.00",
    likes: 1600,
    image: "/catalogo/prod-otdr.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: true,
  },
  {
    id: "powermeter",
    name: "Medidor de potencia óptica",
    line: "Instrumentos de medición óptica",
    category: "medicion",
    price: "L 4,890.00",
    likes: 1200,
    image: "/catalogo/prod-powermeter.jpg",
    href: "/tienda/categoria/instrumentos-de-medicion-optica",
    offer: false,
  },
  {
    id: "gabinete",
    name: "Gabinete de distribución 24 puertos",
    line: "Gabinetes y Racks",
    category: "gabinetes",
    price: "L 6,750.00",
    likes: 960,
    image: "/catalogo/prod-gabinete.jpg",
    href: "/tienda/categoria/gabinetes-y-racks",
    offer: true,
  },
  {
    id: "kit-herramientas",
    name: "Kit de herramientas FTTH",
    line: "Herramientas y kits",
    category: "herramientas",
    price: "L 3,250.00",
    likes: 1800,
    image: "/catalogo/prod-herramientas.jpg",
    href: "/tienda/categoria/herramientas-y-kits",
    offer: false,
  },
  {
    id: "cable-adss",
    name: "Cable ADSS 24 hilos",
    line: "Componentes pasivos",
    category: "fibra",
    price: "L 1,480.00",
    likes: 760,
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
  { icon: "heart", title: "Recomendado por técnicos", text: "Instaladores de todo el país" },
  { icon: "star", title: "Líneas mejor valoradas", text: "Calidad que se mide en campo" },
  { icon: "percent", title: "Mejor precio", text: "Cotiza antes de comprar" },
];

export const HERO_IMAGE = "/catalogo-vitrina/hero-banner.jpg";
