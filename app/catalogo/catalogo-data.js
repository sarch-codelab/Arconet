import { Cable, Network, Radio, Satellite, SlidersHorizontal } from "lucide-react";

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
    image: "/splitters-opticos.png",
    imageAlt: "Splitter óptico para distribución de fibra",
    visual: "productVisual",
    icon: Cable,
    gallery: [
      { src: "/splitters-opticos.png", alt: "Splitter óptico de fibra", fit: "contain", caption: "Producto" },
      { src: "/catalogo/infraestructura.jpg", alt: "Fibra instalada en centro de datos", fit: "cover", caption: "En instalación" },
      { src: "/empresa.webp", alt: "Instalaciones de Arconet en San Pedro Sula", fit: "cover", caption: "Arconet" },
    ],
  },
  {
    id: "catv",
    slug: "catv-satelite",
    index: "02",
    category: "CATV y satélite",
    title: "CATV y satélite",
    badge: "Línea disponible",
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
    image: "/gabinete-rack-de-piso.png",
    imageAlt: "Gabinete rack de piso para equipos de red",
    visual: "productVisual",
    icon: Network,
    gallery: [
      { src: "/gabinete-rack-de-piso.png", alt: "Gabinete rack de piso", fit: "contain", caption: "Producto" },
      { src: "/catalogo/infraestructura.jpg", alt: "Equipos montados en rack", fit: "cover", caption: "En instalación" },
      { src: "/empresa.webp", alt: "Instalaciones de Arconet", fit: "cover", caption: "Arconet" },
    ],
  },
  {
    id: "medicion",
    slug: "medicion-y-senal",
    index: "04",
    category: "Medición y señal",
    title: "Medición y señal",
    badge: "A consulta",
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
    visual: "graphicVisual",
    icon: Radio,
    gallery: [
      { src: null, alt: "", fit: "contain", caption: "Línea" },
      { src: "/catalogo/infraestructura.jpg", alt: "Trabajo sobre equipos de red", fit: "cover", caption: "En campo" },
      { src: "/empresa.webp", alt: "Instalaciones de Arconet", fit: "cover", caption: "Arconet" },
    ],
  },
  {
    id: "accesorios",
    slug: "accesorios-tecnicos",
    index: "05",
    category: "Accesorios",
    title: "Accesorios técnicos",
    badge: "A consulta",
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
    visual: "graphicVisual",
    icon: SlidersHorizontal,
    gallery: [
      { src: null, alt: "", fit: "contain", caption: "Línea" },
      { src: "/catalogo/infraestructura.jpg", alt: "Detalle de cableado organizado", fit: "cover", caption: "En instalación" },
      { src: "/empresa.webp", alt: "Instalaciones de Arconet", fit: "cover", caption: "Arconet" },
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
