import { Cable, Network, PackageX, Radio, Satellite, SlidersHorizontal, Star, Tag, TriangleAlert } from "lucide-react";
import { formatPrice } from "../admin/products-store";

export { formatPrice };

// Existencias mínimas para marcar una línea como "a punto de acabarse".
export const LOW_STOCK = 20;

export const CATEGORIES = [
  "Todas",
  "Fibra óptica",
  "CATV y satélite",
  "Infraestructura",
  "Medición y señal",
  "Accesorios",
];

export const FAMILIES = [
  {
    id: "fibra",
    slug: "fibra-optica",
    index: "01",
    category: "Fibra óptica",
    title: "Fibra óptica",
    badge: "Línea disponible",
    price: 38,
    stock: 5342,
    bestSeller: true,
    summary: "Todo lo necesario para llevar señal limpia desde el nodo hasta cada hogar o negocio.",
    description:
      "La fibra es la columna vertebral de cualquier red moderna. Trabajamos con splitters, patch cords, pigtails y conectores elegidos para instalaciones FTTH, redes empresariales y enlaces punto a punto. Si no tienes claro qué configuración necesita tu proyecto, lo revisamos contigo antes de cotizar.",
    items: ["Splitters ópticos 1x2, 1x4 y 1x8", "Patch cords y pigtails", "Adaptadores, conectores y acabados"],
    specs: [
      { label: "Tipo", value: "Pasivos de distribución óptica" },
      { label: "Conectores", value: "SC/APC, LC/APC y FC (según modelo)" },
      { label: "Formato", value: "Cassette, panel o componente suelto" },
      { label: "Presentación", value: "Por unidad o por proyecto" },
    ],
    applications: ["Redes FTTH", "Enlaces punto a punto", "Redes empresariales", "CCTV sobre fibra"],
    image: "/catalogo/hero-fiber.jpg",
    imageAlt: "Hebras de fibra óptica iluminadas en azul y cian",
    visual: "photoVisual",
    icon: Cable,
    gallery: [
      { src: "/catalogo/hero-fiber.jpg", alt: "Hebras de fibra óptica iluminadas en azul y cian", fit: "cover", caption: "Fibra óptica" },
      { src: "/catalogo/prod-adss.jpg", alt: "Carrete industrial con cable de fibra óptica ADSS", fit: "cover", caption: "Cable ADSS" },
      { src: "/catalogo/sol-fibra.jpg", alt: "Bandeja de empalme con hebras de fibra organizadas", fit: "cover", caption: "Empalme y organización" },
      { src: "/splitters-opticos.png", alt: "Splitter óptico de fibra", fit: "contain", caption: "Producto" },
    ],
  },
  {
    id: "catv",
    slug: "catv-satelite",
    index: "02",
    category: "CATV y satélite",
    title: "CATV y satélite",
    badge: "Línea disponible",
    price: 1890,
    stock: 0,
    summary: "Equipos para redes de televisión por cable y sistemas satelitales, elegidos para cada instalación.",
    description:
      "Desde el equipo que genera la señal hasta el que la entrega al usuario final. Importamos moduladores, amplificadores, receptores y convertidores para redes CATV y sistemas satelitales, y te ayudamos con el ajuste para que la señal llegue limpia a cada tomacorriente.",
    items: ["Moduladores y amplificadores", "Receptores y convertidores", "Cable coaxial y conectores"],
    specs: [
      { label: "Tipo", value: "Equipos activos y pasivos CATV" },
      { label: "Banda", value: "5 – 1000 MHz (según modelo)" },
      { label: "Conectividad", value: "Coaxial F y enlaces de fibra" },
      { label: "Montaje", value: "Rack 1U o configuración modular" },
    ],
    applications: ["Redes de TV por cable", "Sistemas satelitales", "Head-ends comunitarios", "Distribución multisitio"],
    image: "/catalogo/infraestructura.jpg",
    imageAlt: "Cableado y equipos de telecomunicaciones en instalación",
    visual: "photoVisual",
    icon: Satellite,
    gallery: [
      { src: "/catalogo/infraestructura.jpg", alt: "Equipos y cableado de telecomunicaciones", fit: "cover", caption: "Instalación" },
      { src: "/empresa.webp", alt: "Sede de Arconet en San Pedro Sula", fit: "cover", caption: "Arconet" },
    ],
  },
  {
    id: "infraestructura",
    slug: "infraestructura-de-red",
    index: "03",
    category: "Infraestructura",
    title: "Infraestructura de red",
    badge: "Línea disponible",
    price: 320,
    compareAtPrice: 399,
    stock: 79,
    summary: "El lugar donde vive tu equipo: ordenado, ventilado y listo para crecer contigo.",
    description:
      "Un rack bien armado ahorra horas de mantenimiento. Ofrecemos gabinetes de piso y de pared, paneles de distribución y todos los accesorios de montaje para que tu equipamiento quede protegido, ventilado y ordenado desde el primer día.",
    items: ["Gabinetes rack de piso y pared", "Paneles y organizadores", "Accesorios de montaje y acabado"],
    specs: [
      { label: "Formato", value: "Rack de piso y de pared" },
      { label: "Capacidad", value: "De 6U a 42U" },
      { label: "Material", value: "Acero con acabado electrostático" },
      { label: "Accesorios", value: "Paneles, bandejas y ventilación" },
    ],
    applications: ["Centros de datos pequeños", "Salas técnicas", "Telecomunicaciones", "Seguridad y CCTV"],
    image: "/catalogo/prod-gabinete.jpg",
    imageAlt: "Gabinete rack de telecomunicaciones con paneles de conexión",
    visual: "photoVisual",
    icon: Network,
    gallery: [
      { src: "/catalogo/prod-gabinete.jpg", alt: "Gabinete rack de telecomunicaciones con paneles de conexión", fit: "cover", caption: "Gabinete" },
      { src: "/catalogo/sol-redes.jpg", alt: "Panel de conexiones con cables de red ordenados", fit: "cover", caption: "Organización de red" },
      { src: "/gabinete-rack-de-piso.png", alt: "Gabinete rack de piso", fit: "contain", caption: "Producto" },
      { src: "/catalogo/infraestructura.jpg", alt: "Equipos montados en rack", fit: "cover", caption: "En instalación" },
    ],
  },
  {
    id: "medicion",
    slug: "medicion-y-senal",
    index: "04",
    category: "Medición y señal",
    title: "Medición y señal",
    badge: "A consulta",
    price: 4300,
    stock: 14,
    summary: "Instrumentos para instalar, ajustar y diagnosticar sin depender de la improvisación.",
    description:
      "La diferencia entre una instalación que funciona y una que regresan a corregir casi siempre está en la medición. Ponemos a tu disposición medidores de nivel y potencia, moduladores y accesorios de prueba para instalar con criterio y resolver rápido en campo.",
    items: ["Medidores de nivel y potencia", "Moduladores de señal", "Accesorios de prueba"],
    specs: [
      { label: "Tipo", value: "Instrumentos de medición e instalación" },
      { label: "Uso", value: "Ajuste y diagnóstico de señal" },
      { label: "Formato", value: "Equipo portátil para campo" },
      { label: "Incluye", value: "Estuche y accesorios de prueba" },
    ],
    applications: ["Instalación en campo", "Mantenimiento preventivo", "Diagnóstico de fallas", "Puesta en marcha"],
    image: "/catalogo/prod-otdr.jpg",
    imageAlt: "Reflectómetro óptico OTDR con traza de fibra en pantalla",
    visual: "photoVisual",
    icon: Radio,
    gallery: [
      { src: "/catalogo/prod-otdr.jpg", alt: "Reflectómetro óptico OTDR con traza de fibra en pantalla", fit: "cover", caption: "OTDR" },
      { src: "/catalogo/prod-powermeter.jpg", alt: "Medidor de potencia óptica portátil para redes PON", fit: "cover", caption: "Power Meter" },
      { src: "/catalogo/prod-fusionadora.jpg", alt: "Fusionadora de fibra óptica con cámara de alineación abierta", fit: "cover", caption: "Fusionadora" },
      { src: "/catalogo/sol-medicion.jpg", alt: "Equipos profesionales de medición para fibra óptica", fit: "cover", caption: "Set de medición" },
    ],
  },
  {
    id: "accesorios",
    slug: "accesorios-tecnicos",
    index: "05",
    category: "Accesorios",
    title: "Accesorios técnicos",
    badge: "A consulta",
    price: 95,
    stock: 96,
    summary: "Esos componentes que casi nunca aparecen en la lista y hacen que todo quede profesional.",
    description:
      "Conectores, terminaciones, canalización, etiquetado y los consumibles que se acaban en cada instalación. Tenerlos a mano evita parar el trabajo por una pieza pequeña, por eso mantenemos surtido constante de lo que realmente se usa en campo.",
    items: ["Conectores y terminaciones", "Canalización y etiquetado", "Consumibles de instalación"],
    specs: [
      { label: "Tipo", value: "Componentes y consumibles" },
      { label: "Uso", value: "Terminación y orden de instalación" },
      { label: "Presentación", value: "Unidad, juego o caja completa" },
      { label: "Disponibilidad", value: "Surtido rotativo de bodega" },
    ],
    applications: ["Terminaciones", "Orden y etiquetado", "Mantenimiento", "Reposición rápida"],
    image: "/catalogo/prod-herramientas.jpg",
    imageAlt: "Estuche con kit de herramientas profesionales para fibra óptica",
    visual: "photoVisual",
    icon: SlidersHorizontal,
    gallery: [
      { src: "/catalogo/prod-herramientas.jpg", alt: "Estuche con kit de herramientas profesionales para fibra óptica", fit: "cover", caption: "Kit de herramientas" },
      { src: "/catalogo/sol-fibra.jpg", alt: "Bandeja de empalme con hebras de fibra organizadas", fit: "cover", caption: "Terminaciones" },
      { src: "/catalogo/hero-fiber.jpg", alt: "Hebras de fibra óptica iluminadas en azul y cian", fit: "cover", caption: "Pigtails y conectores" },
    ],
  },
];

export const TRUST = [
  {
    title: "Importación directa",
    text: "Traemos el equipo sin intermediarios de más.",
  },
  {
    title: "Asesoría de una persona",
    text: "Alguien revisa tu proyecto contigo.",
  },
  {
    title: "Entrega en Honduras",
    text: "Coordinamos la entrega donde estés.",
  },
];

export function findFamily(slug) {
  return FAMILIES.find((family) => family.slug === slug || family.id === slug);
}

/**
 * Estado de existencias de una línea: "ok", "low" (a punto de acabarse) u "out" (agotado).
 */
export function getStockState(family) {
  const stock = Number(family?.stock) || 0;
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK) return "low";
  return "ok";
}

/**
 * Insignias que se muestran sobre la imagen de la tarjeta del catálogo.
 */
export function getFamilyFlags(family) {
  const flags = [];
  const stock = Number(family?.stock) || 0;
  const compareAt = Number(family?.compareAtPrice) || 0;
  const price = Number(family?.price) || 0;

  if (family?.bestSeller) {
    flags.push({ id: "bestseller", label: "Más vendido", icon: Star });
  }
  if (compareAt > price && price > 0) {
    const discount = Math.round((1 - price / compareAt) * 100);
    flags.push({
      id: "offer",
      label: discount > 0 ? `En oferta · -${discount}%` : "En oferta",
      icon: Tag,
    });
  }
  if (stock <= 0) {
    flags.push({ id: "soldout", label: "Agotado", icon: PackageX });
  } else if (stock <= LOW_STOCK) {
    flags.push({ id: "low", label: "A punto de acabarse", icon: TriangleAlert });
  }

  return flags;
}
