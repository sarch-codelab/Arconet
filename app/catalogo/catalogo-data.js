import {
  Boxes,
  Cable,
  Gauge,
  Layers,
  Network,
  PackageX,
  Radio,
  Ruler,
  Server,
  SlidersHorizontal,
  Star,
  Tag,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { formatPrice } from "../admin/products-store";

export { formatPrice };

// Existencias mínimas para marcar una línea como "a punto de acabarse".
export const LOW_STOCK = 20;

export const CATEGORIES = [
  "Todas",
  "Soluciones de Preconectorizado",
  "Herrajes",
  "Gabinetes y Racks",
  "Cajas de Distribución y Emplazamiento",
  "Soluciones activas y Accesorios FTTH",
  "Herramientas y kits",
  "Escaleras",
  "Optical Distribution Frame - ODF",
  "Instrumentos de medición óptica",
  "Componentes pasivos",
  "Microcables y Microproductos",
];

export const FAMILIES = [
  {
    id: "preconectorizado",
    slug: "soluciones-de-preconectorizado",
    index: "01",
    category: "Soluciones de Preconectorizado",
    title: "Soluciones de Preconectorizado",
    badge: "Catálogo de soluciones",
    price: 120,
    stock: 1200,
    summary:
      "Cables, pigtails y patch cords terminados en fábrica para instalar más rápido y con menos pérdidas.",
    description:
      "Las soluciones preconectorizadas llegan listas para conectar: no hay que pulir ni montar conectores en campo. Eso reduce tiempos de instalación y errores en redes FTTH, enlaces empresariales y proyectos donde cada minuto de trabajo cuenta.",
    items: [
      "Patch cords y pigtails SC/APC y LC/APC",
      "Cables preterminados a medida",
      "Adaptadores y acopladores",
    ],
    specs: [
      { label: "Tipo", value: "Conectores pulidos de fábrica" },
      { label: "Conector", value: "SC/APC, LC/APC y SC/UPC" },
      { label: "Longitud", value: "De 1 m a 100 m según modelo" },
      { label: "Pérdida", value: "≤ 0.3 dB típica" },
    ],
    applications: [
      "Instalaciones FTTH",
      "Redes empresariales",
      "Data centers",
      "Enlaces de corta distancia",
    ],
    image: "/catalogo/sol-fibra.jpg",
    imageAlt: "Patch cords y pigtails de fibra óptica terminados",
    visual: "photoVisual",
    icon: Cable,
    gallery: [
      { src: "/catalogo/sol-fibra.jpg", alt: "Patch cords y pigtails de fibra óptica", fit: "cover", caption: "Preconectorizado" },
      { src: "/catalogo/prod-adss.jpg", alt: "Carrete de cable de fibra óptica", fit: "cover", caption: "Cable preterminado" },
      { src: "/catalogo/hero-fiber.jpg", alt: "Hebras de fibra óptica iluminadas", fit: "cover", caption: "Fibra óptica" },
    ],
  },
  {
    id: "herrajes",
    slug: "herrajes",
    index: "02",
    category: "Herrajes",
    title: "Herrajes",
    badge: "Catálogo de soluciones",
    price: 85,
    stock: 800,
    summary:
      "Soportes, abrazaderas y tensores para fijar cable y equipos con seguridad en poste, fachada o pared.",
    description:
      "El herraje correcto evita que el cable se venza con el viento o con su propio peso. Manejamos el surtido que realmente se usa en tendido aéreo y fijación de gabinetes, con materiales resistentes a la intemperie.",
    items: [
      "Abrazaderas y grapas",
      "Tensores y guardacabos",
      "Soportes y ménsulas",
    ],
    specs: [
      { label: "Material", value: "Acero galvanizado o inoxidable" },
      { label: "Uso", value: "Tendido aéreo y fijación" },
      { label: "Carga", value: "Según modelo y diámetro" },
      { label: "Acabado", value: "Galvanizado en caliente" },
    ],
    applications: [
      "Tendido aéreo",
      "Fijación de gabinetes",
      "Postes y fachadas",
      "Redes de distribución",
    ],
    image: "/catalogo/infraestructura.jpg",
    imageAlt: "Herrajes y soportes para tendido de fibra óptica",
    visual: "photoVisual",
    icon: SlidersHorizontal,
    gallery: [
      { src: "/catalogo/infraestructura.jpg", alt: "Herrajes y cableado de telecomunicaciones", fit: "cover", caption: "Herrajes" },
      { src: "/catalogo/sol-redes.jpg", alt: "Cables de red organizados en un panel", fit: "cover", caption: "Fijación" },
      { src: "/catalogo/prod-adss.jpg", alt: "Carrete de cable para tendido aéreo", fit: "cover", caption: "Tendido" },
    ],
  },
  {
    id: "infraestructura",
    slug: "gabinetes-y-racks",
    aliases: ["infraestructura-de-red"],
    index: "03",
    category: "Gabinetes y Racks",
    title: "Gabinetes y Racks",
    badge: "Catálogo de soluciones",
    price: 320,
    compareAtPrice: 399,
    stock: 79,
    summary:
      "El lugar donde vive tu equipo: ordenado, ventilado y listo para crecer contigo.",
    description:
      "Un rack bien armado ahorra horas de mantenimiento. Ofrecemos gabinetes de piso y de pared, paneles de distribución y todos los accesorios de montaje para que tu equipamiento quede protegido, ventilado y ordenado desde el primer día.",
    items: [
      "Gabinetes rack de piso y pared",
      "Paneles y organizadores",
      "Accesorios de montaje y acabado",
    ],
    specs: [
      { label: "Formato", value: "Rack de piso y de pared" },
      { label: "Capacidad", value: "De 6U a 42U" },
      { label: "Material", value: "Acero con acabado electrostático" },
      { label: "Accesorios", value: "Paneles, bandejas y ventilación" },
    ],
    applications: [
      "Centros de datos pequeños",
      "Salas técnicas",
      "Telecomunicaciones",
      "Seguridad y CCTV",
    ],
    image: "/catalogo/prod-gabinete.jpg",
    imageAlt: "Gabinete rack de telecomunicaciones con paneles de conexión",
    visual: "photoVisual",
    icon: Network,
    gallery: [
      { src: "/catalogo/prod-gabinete.jpg", alt: "Gabinete rack de telecomunicaciones", fit: "cover", caption: "Gabinete" },
      { src: "/catalogo/sol-redes.jpg", alt: "Panel de conexiones con cables ordenados", fit: "cover", caption: "Organización" },
      { src: "/gabinete-rack-de-piso.png", alt: "Gabinete rack de piso", fit: "contain", caption: "Producto" },
      { src: "/catalogo/infraestructura.jpg", alt: "Equipos montados en rack", fit: "cover", caption: "En instalación" },
    ],
  },
  {
    id: "cajas",
    slug: "cajas-de-distribucion-y-emplazamiento",
    index: "04",
    category: "Cajas de Distribución y Emplazamiento",
    title: "Cajas de Distribución y Emplazamiento",
    badge: "Catálogo de soluciones",
    price: 450,
    stock: 260,
    summary:
      "Cajas de empalme, terminales y NAPs para organizar la distribución y proteger los empalmes en campo.",
    description:
      "Cada punto de la red necesita una caja que resista la intemperie y ordene las hebras. Tenemos soluciones para interior y exterior, desde cajas terminales pequeñas hasta gabinetes de distribución para varios sectores.",
    items: [
      "Cajas de empalme y terminales",
      "NAPs y cajas de distribución",
      "Bandejas y protectores de empalme",
    ],
    specs: [
      { label: "Instalación", value: "Interior y exterior" },
      { label: "Capacidad", value: "De 4 a 48 puertos" },
      { label: "Protección", value: "IP54 a IP68 según modelo" },
      { label: "Material", value: "PVC o policarbonato reforzado" },
    ],
    applications: [
      "Redes FTTH",
      "Empalmes de campo",
      "Distribución por sectores",
      "Instalaciones en poste",
    ],
    image: "/catalogo/sol-fibra.jpg",
    imageAlt: "Caja de distribución de fibra óptica con empalmes organizados",
    visual: "photoVisual",
    icon: Boxes,
    gallery: [
      { src: "/catalogo/sol-fibra.jpg", alt: "Bandeja de empalme con hebras organizadas", fit: "cover", caption: "Distribución" },
      { src: "/catalogo/prod-adss.jpg", alt: "Cable de fibra óptica para distribución", fit: "cover", caption: "Empalme" },
      { src: "/catalogo/infraestructura.jpg", alt: "Instalación de telecomunicaciones en campo", fit: "cover", caption: "En campo" },
    ],
  },
  {
    id: "activas",
    slug: "soluciones-activas-y-accesorios-ftth",
    aliases: ["catv-satelite"],
    index: "05",
    category: "Soluciones activas y Accesorios FTTH",
    title: "Soluciones activas y Accesorios FTTH",
    badge: "Catálogo de soluciones",
    price: 1890,
    stock: 40,
    summary:
      "Equipos activos y accesorios para redes FTTH, CATV y enlaces ópticos, desde la cabecera hasta el cliente.",
    description:
      "Desde el equipo que genera la señal hasta el que la entrega al usuario final. Importamos moduladores, amplificadores, receptores y accesorios para redes CATV y despliegues FTTH, y te ayudamos con el ajuste para que la señal llegue limpia.",
    items: [
      "Moduladores, amplificadores y receptores",
      "Equipos activos para FTTH",
      "Accesorios de instalación FTTH",
    ],
    specs: [
      { label: "Tipo", value: "Equipos activos y accesorios" },
      { label: "Banda", value: "5 – 1000 MHz según modelo" },
      { label: "Conectividad", value: "Coaxial, fibra y Ethernet" },
      { label: "Montaje", value: "Rack 1U o configuración modular" },
    ],
    applications: [
      "Redes de TV por cable",
      "Sistemas satelitales",
      "Head-ends comunitarios",
      "Despliegues FTTH",
    ],
    image: "/catalogo/infraestructura.jpg",
    imageAlt: "Equipos activos y cableado de telecomunicaciones",
    visual: "photoVisual",
    icon: Radio,
    gallery: [
      { src: "/catalogo/infraestructura.jpg", alt: "Equipos y cableado de telecomunicaciones", fit: "cover", caption: "Instalación" },
      { src: "/catalogo/sol-redes.jpg", alt: "Panel de red con equipos activos", fit: "cover", caption: "Red activa" },
      { src: "/empresa.webp", alt: "Sede de Arconet en San Pedro Sula", fit: "cover", caption: "Arconet" },
    ],
  },
  {
    id: "herramientas",
    slug: "herramientas-y-kits",
    aliases: ["accesorios-tecnicos"],
    index: "06",
    category: "Herramientas y kits",
    title: "Herramientas y kits",
    badge: "Catálogo de soluciones",
    price: 1850,
    stock: 60,
    summary:
      "Kits y herramientas de campo para pelar, limpiar, cortar y terminar fibra sin improvisar.",
    description:
      "Una herramienta adecuada hace la diferencia entre una terminación que dura y una que hay que repetir. Ofrecemos kits de instalación, pelacables, cleavers y estuches con los consumibles que se usan a diario en campo.",
    items: [
      "Kits de herramientas para fibra",
      "Pelacables y cleavers",
      "Estuches y consumibles",
    ],
    specs: [
      { label: "Tipo", value: "Herramientas y kits de instalación" },
      { label: "Uso", value: "Terminación y mantenimiento" },
      { label: "Presentación", value: "Kit, estuche o pieza suelta" },
      { label: "Incluye", value: "Accesorios de limpieza y corte" },
    ],
    applications: [
      "Instalación FTTH",
      "Mantenimiento",
      "Terminación de conectores",
      "Trabajo en campo",
    ],
    image: "/catalogo/prod-herramientas.jpg",
    imageAlt: "Estuche con kit de herramientas profesionales para fibra óptica",
    visual: "photoVisual",
    icon: Wrench,
    gallery: [
      { src: "/catalogo/prod-herramientas.jpg", alt: "Kit de herramientas para fibra óptica", fit: "cover", caption: "Kit" },
      { src: "/catalogo/kit-herramientas.png", alt: "Herramientas de telecomunicaciones", fit: "contain", caption: "Herramientas" },
      { src: "/catalogo/sol-medicion.jpg", alt: "Equipos profesionales de medición", fit: "cover", caption: "Medición" },
    ],
  },
  {
    id: "escaleras",
    slug: "escaleras",
    index: "07",
    category: "Escaleras",
    title: "Escaleras",
    badge: "Catálogo de soluciones",
    price: 3200,
    stock: 18,
    summary:
      "Escaleras y accesorios de altura para llegar a postes, bandejas y gabinetes con seguridad.",
    description:
      "El trabajo en altura exige equipo confiable. Ofrecemos escaleras de fibra de vidrio, telescópicas y de tijera, además de bases y accesorios de apoyo para instalaciones en interior y exterior.",
    items: [
      "Escaleras de fibra de vidrio",
      "Escaleras telescópicas y de tijera",
      "Bases y accesorios de apoyo",
    ],
    specs: [
      { label: "Material", value: "Fibra de vidrio o aluminio" },
      { label: "Altura", value: "Según modelo" },
      { label: "Capacidad", value: "Hasta 150 kg" },
      { label: "Uso", value: "Interior y exterior" },
    ],
    applications: [
      "Trabajo en postes",
      "Montaje de bandejas",
      "Mantenimiento de gabinetes",
      "Instalaciones en altura",
    ],
    image: "/catalogo/ingeniero-casco-redes.png",
    imageAlt: "Técnico con casco trabajando en una instalación de red",
    visual: "photoVisual",
    icon: Ruler,
    gallery: [
      { src: "/catalogo/ingeniero-casco-redes.png", alt: "Técnico con equipo de seguridad en campo", fit: "cover", caption: "Trabajo en altura" },
      { src: "/catalogo/infraestructura.jpg", alt: "Instalación de telecomunicaciones", fit: "cover", caption: "Instalación" },
      { src: "/catalogo/sol-redes.jpg", alt: "Cableado de red organizado", fit: "cover", caption: "Redes" },
    ],
  },
  {
    id: "odf",
    slug: "optical-distribution-frame-odf",
    index: "08",
    category: "Optical Distribution Frame - ODF",
    title: "Optical Distribution Frame - ODF",
    badge: "Catálogo de soluciones",
    price: 4800,
    stock: 12,
    summary:
      "Bandejas y marcos ODF para ordenar, proteger y administrar terminaciones de fibra en sala técnica.",
    description:
      "El ODF es el punto donde la fibra se ordena y se administra. Ofrecemos marcos de rack y de pared, bandejas de terminación y organizadores para que cada puerto quede identificado y accesible.",
    items: [
      "ODF de rack y de pared",
      "Bandejas y módulos de terminación",
      "Patch panels y organizadores",
    ],
    specs: [
      { label: "Formato", value: "Rack 19\" o pared" },
      { label: "Capacidad", value: "De 12 a 288 puertos" },
      { label: "Conectores", value: "SC/APC, LC/APC y LC/UPC" },
      { label: "Material", value: "Acero con acabado electrostático" },
    ],
    applications: [
      "Data centers",
      "Salas de telecomunicaciones",
      "Nodos ópticos",
      "Redes empresariales",
    ],
    image: "/catalogo/prod-gabinete.png",
    imageAlt: "Gabinete y marco de distribución óptica ODF",
    visual: "photoVisual",
    icon: Server,
    gallery: [
      { src: "/catalogo/prod-gabinete.png", alt: "Gabinete para distribución óptica", fit: "contain", caption: "ODF" },
      { src: "/gabinete-rack-de-piso.png", alt: "Rack de piso para ODF", fit: "contain", caption: "Rack" },
      { src: "/catalogo/sol-redes.jpg", alt: "Panel de conexiones ordenado", fit: "cover", caption: "Terminaciones" },
    ],
  },
  {
    id: "medicion",
    slug: "instrumentos-de-medicion-optica",
    aliases: ["medicion-y-senal"],
    index: "09",
    category: "Instrumentos de medición óptica",
    title: "Instrumentos de medición óptica",
    badge: "Catálogo de soluciones",
    price: 4300,
    stock: 14,
    summary:
      "Instrumentos para instalar, ajustar y diagnosticar fibra sin depender de la improvisación.",
    description:
      "La diferencia entre una instalación que funciona y una que regresan a corregir casi siempre está en la medición. Ponemos a tu disposición OTDR, medidores de potencia, fusionadoras y accesorios de prueba para instalar con criterio y resolver rápido en campo.",
    items: [
      "OTDR y medidores de potencia",
      "Fusionadoras y cortadoras",
      "Accesorios de prueba y calibración",
    ],
    specs: [
      { label: "Tipo", value: "Instrumentos de medición óptica" },
      { label: "Uso", value: "Ajuste y diagnóstico de fibra" },
      { label: "Formato", value: "Equipo portátil para campo" },
      { label: "Incluye", value: "Estuche y accesorios de prueba" },
    ],
    applications: [
      "Instalación en campo",
      "Mantenimiento preventivo",
      "Diagnóstico de fallas",
      "Puesta en marcha",
    ],
    image: "/catalogo/prod-otdr.jpg",
    imageAlt: "Reflectómetro óptico OTDR con traza de fibra en pantalla",
    visual: "photoVisual",
    icon: Gauge,
    gallery: [
      { src: "/catalogo/prod-otdr.jpg", alt: "OTDR con traza de fibra en pantalla", fit: "cover", caption: "OTDR" },
      { src: "/catalogo/prod-powermeter.jpg", alt: "Medidor de potencia óptica portátil", fit: "cover", caption: "Power Meter" },
      { src: "/catalogo/prod-fusionadora.jpg", alt: "Fusionadora de fibra óptica", fit: "cover", caption: "Fusionadora" },
      { src: "/catalogo/sol-medicion.jpg", alt: "Equipos profesionales de medición", fit: "cover", caption: "Set de medición" },
    ],
  },
  {
    id: "pasivos",
    slug: "componentes-pasivos",
    aliases: ["fibra-optica"],
    index: "10",
    category: "Componentes pasivos",
    title: "Componentes pasivos",
    badge: "Catálogo de soluciones",
    price: 850,
    stock: 5342,
    bestSeller: true,
    summary:
      "Splitters, conectores, adaptadores y cable para armar la red óptica sin componentes activos.",
    description:
      "La fibra es la columna vertebral de cualquier red moderna. Trabajamos con splitters, conectores, adaptadores y cable elegidos para instalaciones FTTH, redes empresariales y enlaces punto a punto. Si no tienes claro qué configuración necesita tu proyecto, lo revisamos contigo antes de cotizar.",
    items: [
      "Splitters ópticos 1x2, 1x4 y 1x8",
      "Conectores y adaptadores",
      "Cable óptico y coaxial",
    ],
    specs: [
      { label: "Tipo", value: "Pasivos de distribución óptica" },
      { label: "Conectores", value: "SC/APC, LC/APC y FC" },
      { label: "Formato", value: "Cassette, panel o componente suelto" },
      { label: "Presentación", value: "Por unidad o por proyecto" },
    ],
    applications: [
      "Redes FTTH",
      "Enlaces punto a punto",
      "Redes empresariales",
      "CCTV sobre fibra",
    ],
    image: "/catalogo/hero-fiber.jpg",
    imageAlt: "Hebras de fibra óptica iluminadas en azul y cian",
    visual: "photoVisual",
    icon: Layers,
    gallery: [
      { src: "/catalogo/hero-fiber.jpg", alt: "Hebras de fibra óptica iluminadas", fit: "cover", caption: "Fibra óptica" },
      { src: "/catalogo/prod-adss.jpg", alt: "Carrete de cable de fibra óptica ADSS", fit: "cover", caption: "Cable ADSS" },
      { src: "/splitters-opticos.png", alt: "Splitter óptico de fibra", fit: "contain", caption: "Splitter" },
      { src: "/catalogo/sol-fibra.jpg", alt: "Bandeja de empalme con fibra organizada", fit: "cover", caption: "Empalme" },
    ],
  },
  {
    id: "microcables",
    slug: "microcables-y-microproductos",
    index: "11",
    category: "Microcables y Microproductos",
    title: "Microcables y Microproductos",
    badge: "Catálogo de soluciones",
    price: 45,
    stock: 8600,
    summary:
      "Microcables, microductos y accesorios compactos para instalaciones FTTH de alta densidad.",
    description:
      "Los microcables permiten llevar fibra óptica por ductos estrechos y espacios reducidos sin sacrificar protección ni rendimiento. Esta línea reúne microcables de pocos hilos, microductos y accesorios compactos para despliegues FTTH en edificios, condominios y redes donde cada centímetro cuenta.",
    items: [
      "Microcables de 2 a 24 hilos",
      "Microductos y tubería de instalación",
      "Accesorios y cajas compactas",
    ],
    specs: [
      { label: "Tipo", value: "Microcable y microducto para FTTH" },
      { label: "Hilos", value: "De 2 a 24 fibras según modelo" },
      { label: "Diámetro", value: "Compacto para ductos de alta densidad" },
      { label: "Presentación", value: "Carrete, rollo o por metro" },
    ],
    applications: [
      "Redes FTTH de alta densidad",
      "Edificios y condominios",
      "Instalaciones por microducto",
      "Acometidas interiores",
    ],
    image: "/catalogo/prod-adss.jpg",
    imageAlt: "Microcable de fibra óptica en carrete",
    visual: "photoVisual",
    icon: Cable,
    gallery: [
      { src: "/catalogo/prod-adss.jpg", alt: "Carrete de microcable de fibra óptica", fit: "cover", caption: "Microcable" },
      { src: "/catalogo/sol-fibra.jpg", alt: "Fibra óptica preparada para instalación", fit: "cover", caption: "Instalación" },
      { src: "/catalogo/hero-fiber.jpg", alt: "Hebras de fibra óptica iluminadas", fit: "cover", caption: "Fibra óptica" },
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
  return FAMILIES.find(
    (family) =>
      family.slug === slug ||
      family.id === slug ||
      family.category === slug ||
      (Array.isArray(family.aliases) && family.aliases.includes(slug)),
  );
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
      label: discount > 0 ? `En oferta → -${discount}%` : "En oferta",
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
