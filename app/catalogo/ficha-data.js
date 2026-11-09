// Fichas de los 6 «Productos destacados» de /catalogo.
//
// IMPORTANTE: son fichas EDITORIALES, no artículos de la base de datos. Los
// equipos de la vitrina se crearon como contenido ilustrativo del catálogo (ver
// app/catalogo/vitrina-data.js) y no existen en /api/productos, donde hoy solo
// hay inventario heredado de «Componentes pasivos». Por eso:
//
//   * Los precios, las existencias y las especificaciones son de REFERENCIA, en
//     lempiras, y la ficha lo dice en pantalla. La cotización real se confirma
//     con el equipo en /contacto o /tienda. No se escriben precios en la BD.
//   * «Agregar al carrito» usa el carrito de cotización global (CartProvider):
//     añade una línea local con el nombre y la presentación, sin inventar un
//     producto en la base ni llamar a ningún API de compra.
//   * Las miniaturas 2/3/4 son recortes de la MISMA foto de cada equipo. No
//     representan otros productos ni colores que no se vendan.
//
// La ruta es /catalogo/ficha/[slug] y no /catalogo/producto/[slug]: ese último
// prefijo ya tiene un 301 permanente hacia /tienda/producto/[slug] en
// next.config.mjs, y las redirecciones se evalúan antes que las páginas.
// Conservar ese 301 evita romper enlaces guardados a fichas reales de /tienda.

export const FICHA_BASE = "/catalogo/ficha";

export const rutaFicha = (slug) => `${FICHA_BASE}/${slug}`;

export const formatearPrecio = (valor) => `L ${Number(valor).toLocaleString("es-HN")}`;

const galeria = (slug, principal) => [
  principal,
  `/catalogo-vitrina/fichas/${slug}-2.webp`,
  `/catalogo-vitrina/fichas/${slug}-3.webp`,
  `/catalogo-vitrina/fichas/${slug}-4.webp`,
];

export const FICHAS = {
  "fusionadora": {
    precio: 42800,
    precioAnterior: null,
    etiqueta: "Instrumento de precisión",
    descripcion:
      "Fusionadora de arco para empalmes de fibra óptica en campo y en planta. Alineación por núcleo, horno protegido y pantalla amplia para certificar cada unión sin repetir el trabajo.",
    destacados: [
      "Alineación por núcleo con estimación de pérdida en cada empalme",
      "Horno y electrodos protegidos para jornadas completas de instalación",
      "Batería extraíble y maletín de transporte para cuadrillas en campo",
    ],
    presentaciones: [
      { id: "equipo", label: "Equipo suelto", nota: "Solo fusionadora y cargador", tint: "#1544b5" },
      { id: "campo", label: "Kit de campo", nota: "Con cortadora y peladora", tint: "#14867c" },
      { id: "pro", label: "Kit profesional", nota: "Con estuche rígido y repuestos", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Método de empalme", detalle: "Fusión por arco eléctrico", extra: "SM, MM, DS, NZDS", observacion: "Pérdida típica ≤ 0,02 dB" },
      { nombre: "Tiempo de fusión", detalle: "7 s en modo rápido", extra: "≈ 18 s con horno completo", observacion: "Según tipo de fibra" },
      { nombre: "Pantalla", detalle: "LCD 5 pulgadas", extra: "Vista de núcleo ampliada", observacion: "Legible con luz solar" },
      { nombre: "Alimentación", detalle: "Batería de litio extraíble", extra: "100–240 V / 12 V", observacion: "Cargador incluido" },
      { nombre: "Capacidad", detalle: "≈ 300 empalmes por carga", extra: "Electrodos reemplazables", observacion: "Uso en campo" },
      { nombre: "Garantía", detalle: "12 meses", extra: "Soporte técnico local", observacion: "Consumibles aparte" },
    ],
    galeria: galeria("fusionadora", "/catalogo/prod-fusionadora.jpg"),
  },

  "otdr": {
    precio: 61500,
    precioAnterior: 68400,
    etiqueta: "Oferta de temporada",
    descripcion:
      "OTDR de campo de doble longitud de onda para caracterizar enlaces, localizar eventos y entregar trazas certificadas. Pensado para cuadrillas que necesitan medir y documentar en el mismo día.",
    destacados: [
      "1310 / 1550 nm con rango dinámico para enlaces FTTH y troncales",
      "Detección automática de eventos y traza exportable",
      "Carcasa resistente a golpes con pantalla táctil de lectura exterior",
    ],
    presentaciones: [
      { id: "equipo", label: "Equipo base", nota: "OTDR, batería y cargador", tint: "#1544b5" },
      { id: "campo", label: "Con lanzador", nota: "Incluye carrete de lanzamiento", tint: "#b8622a" },
      { id: "pro", label: "Kit certificación", nota: "Con fuente y medidor", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Longitudes de onda", detalle: "1310 / 1550 nm", extra: "Opcional 1625 nm", observacion: "SM (G.652/G.657)" },
      { nombre: "Rango dinámico", detalle: "32 / 30 dB", extra: "Pulso 3 ns – 20 µs", observacion: "Promedio 3 min" },
      { nombre: "Zona muerta", detalle: "0,8 m (evento)", extra: "4 m (atenuación)", observacion: "Con lanzador recomendado" },
      { nombre: "Alcance", detalle: "Hasta 120 km", extra: "Trazas SR-4731", observacion: "Exportación por USB" },
      { nombre: "Pantalla", detalle: "Táctil 7 pulgadas", extra: "Interfaz en español", observacion: "Guantes de trabajo" },
      { nombre: "Garantía", detalle: "12 meses", extra: "Calibración anual", observacion: "Cotizar servicio" },
    ],
    galeria: galeria("otdr", "/catalogo/prod-otdr.jpg"),
  },

  "powermeter": {
    precio: 8950,
    precioAnterior: null,
    etiqueta: "Medición esencial",
    descripcion:
      "Medidor de potencia óptica de bolsillo para verificar pérdidas en conectores, tramos y distribuidores. Lectura estable, referencia configurable y formato compacto para la bolsa del técnico.",
    destacados: [
      "Rango de medición amplio con resolución de 0,01 dB",
      "Longitudes de onda calibradas y memoria de referencia (REF)",
      "Conectores intercambiables SC, FC y LC para trabajo mixto",
    ],
    presentaciones: [
      { id: "equipo", label: "Medidor", nota: "Equipo y funda", tint: "#1544b5" },
      { id: "fuente", label: "Con fuente", nota: "Incluye fuente láser", tint: "#14867c" },
      { id: "kit", label: "Kit de pérdida", nota: "Con cables de referencia", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Rango de potencia", detalle: "−70 a +10 dBm", extra: "Resolución 0,01 dB", observacion: "InGaAs" },
      { nombre: "Longitudes de onda", detalle: "850 / 1310 / 1490 / 1550 nm", extra: "Más 1300 y 1625 nm", observacion: "Selección manual" },
      { nombre: "Precisión", detalle: "± 0,2 dB", extra: "A 23 °C / −20 dBm", observacion: "Calibración anual" },
      { nombre: "Conector", detalle: "Universal 2,5 mm", extra: "Adaptadores SC / FC / ST", observacion: "LC con adaptador" },
      { nombre: "Alimentación", detalle: "3 × AAA", extra: "Apagado automático", observacion: "≈ 80 h de uso" },
      { nombre: "Garantía", detalle: "12 meses", extra: "Repuestos locales", observacion: "Consumibles aparte" },
    ],
    galeria: galeria("powermeter", "/catalogo/prod-powermeter.jpg"),
  },

  "gabinete": {
    precio: 12400,
    precioAnterior: 13900,
    etiqueta: "Oferta de temporada",
    descripcion:
      "Gabinete de distribución de 24 puertos para organizar, proteger y etiquetar terminaciones de fibra en edificios y nodos. Puerta con cierre, bandeja de empalmes y guías para patch cords.",
    destacados: [
      "Chasis metálico con puerta con cerradura y visor",
      "Bandejas de empalme extraíbles y guías de cableado",
      "Etiquetado por puerto para entregas y mantenimiento",
    ],
    presentaciones: [
      { id: "vacio", label: "Chasis vacío", nota: "Solo gabinete y bandejas", tint: "#1544b5" },
      { id: "24sc", label: "24 puertos SC", nota: "Con acopladores SC/APC", tint: "#14867c" },
      { id: "24lc", label: "24 puertos LC", nota: "Con acopladores dúplex", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Capacidad", detalle: "24 puertos", extra: "Hasta 48 fibras en dúplex", observacion: "Ampliable a 48" },
      { nombre: "Material", detalle: "Acero laminado en frío", extra: "Pintura electrostática", observacion: "Gris grafito" },
      { nombre: "Montaje", detalle: "Pared / rack 19\"", extra: "Tornillería incluida", observacion: "2U de altura" },
      { nombre: "Conectores", detalle: "SC / LC / FC", extra: "APC o UPC", observacion: "Según configuración" },
      { nombre: "Protección", detalle: "Puerta con cerradura", extra: "Entradas con prensaestopas", observacion: "Uso interior" },
      { nombre: "Garantía", detalle: "12 meses", extra: "Instalación opcional", observacion: "Cotizar en sitio" },
    ],
    galeria: galeria("gabinete", "/catalogo/prod-gabinete.jpg"),
  },

  "kit-herramientas": {
    precio: 6750,
    precioAnterior: null,
    etiqueta: "Listo para instalar",
    descripcion:
      "Kit FTTH con las herramientas que se usan en cada visita: peladora, cortadora de precisión, crimpadora, destornilladores y consumibles, ordenados en un estuche rígido que aguanta el traslado diario.",
    destacados: [
      "Cortadora de fibra con hoja giratoria y ajuste de longitud",
      "Peladoras y crimpadora calibradas para conectores rápidos",
      "Estuche rígido con espuma troquelada y compartimentos",
    ],
    presentaciones: [
      { id: "basico", label: "Kit básico", nota: "12 piezas esenciales", tint: "#1544b5" },
      { id: "completo", label: "Kit completo", nota: "18 piezas y consumibles", tint: "#b8622a" },
      { id: "cuadrilla", label: "Kit cuadrilla", nota: "Para dos instaladores", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Contenido", detalle: "12 a 18 piezas", extra: "Según presentación", observacion: "Ver lista al cotizar" },
      { nombre: "Cortadora", detalle: "Hoja de carburo", extra: "≈ 48 000 cortes", observacion: "Repuesto disponible" },
      { nombre: "Peladora", detalle: "250 / 900 µm", extra: "Hasta 3 mm de cable", observacion: "Cuchilla ajustable" },
      { nombre: "Crimpadora", detalle: "RG-6 / RG-11", extra: "Conectores F y BNC", observacion: "Matriz intercambiable" },
      { nombre: "Estuche", detalle: "ABS con espuma", extra: "Asa y cierres", observacion: "Resiste salpicaduras" },
      { nombre: "Garantía", detalle: "6 meses", extra: "Repuestos locales", observacion: "Consumibles aparte" },
    ],
    galeria: galeria("kit-herramientas", "/catalogo/prod-herramientas.jpg"),
  },

  "cable-adss": {
    precio: 38,
    precioAnterior: null,
    etiqueta: "Por metro",
    descripcion:
      "Cable ADSS de 24 hilos para tendidos aéreos autoportantes, sin tirante metálico y con chaqueta resistente a radiación UV. Pensado para tramos entre postes donde no se puede usar cable con armadura.",
    destacados: [
      "24 fibras G.652D en tubos sueltos con gel bloqueador",
      "Dieléctrico completo: no requiere puesta a tierra del mensajero",
      "Chaqueta PE negra para intemperie y radiación UV",
    ],
    presentaciones: [
      { id: "metro", label: "Por metro", nota: "Corte a la medida", tint: "#1544b5" },
      { id: "carrete", label: "Carrete 1 km", nota: "Bobina completa", tint: "#14867c" },
      { id: "obra", label: "Por proyecto", nota: "Cotiza el tendido", tint: "#6b7280" },
    ],
    especificaciones: [
      { nombre: "Fibra", detalle: "24 hilos G.652D", extra: "SM 9/125 µm", observacion: "Tubos sueltos" },
      { nombre: "Construcción", detalle: "Totalmente dieléctrico", extra: "Hilos de aramida", observacion: "Sin mensajero metálico" },
      { nombre: "Chaqueta", detalle: "PE negro UV", extra: "Doble cubierta opcional", observacion: "Uso exterior" },
      { nombre: "Vano", detalle: "Hasta 120 m", extra: "Según flecha y carga", observacion: "Calcular por zona" },
      { nombre: "Atenuación", detalle: "≤ 0,35 dB/km a 1310 nm", extra: "≤ 0,21 dB/km a 1550 nm", observacion: "Valores de fábrica" },
      { nombre: "Presentación", detalle: "Por metro", extra: "Carrete de 1 o 2 km", observacion: "Cotizar longitudes" },
    ],
    galeria: galeria("cable-adss", "/catalogo/prod-adss.jpg"),
  },
};

export const FICHA_SLUGS = Object.keys(FICHAS);

export const TABS_FICHA = [
  { id: "descripcion", label: "Descripción" },
  { id: "especificaciones", label: "Especificaciones" },
  { id: "envio", label: "Envío y garantía" },
];

export const CONFIANZA_FICHA = [
  { titulo: "Entrega en todo Honduras", texto: "San Pedro Sula y el resto del país" },
  { titulo: "Pago y facturación claros", texto: "Cotización por escrito antes de comprar" },
  { titulo: "Soporte técnico", texto: "Te atiende una persona del equipo" },
];

export const NOTA_PRECIOS =
  "Precios y especificaciones de referencia: el valor final, la disponibilidad y la presentación se confirman con nuestro equipo antes de facturar.";
