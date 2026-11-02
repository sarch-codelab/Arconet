// Navegación principal compartida por el dock del home (menú 2) y las
// páginas de categoría y producto. Misma estructura: items planos y un mega
// menú (Soluciones) con grupos de enlaces de la tienda.
export const NAVIGATION = [
  { id: "inicio", label: "Inicio", href: "#inicio", mega: false },
  { id: "soluciones", label: "Soluciones", href: "#soluciones", mega: true, megaGroups: [
    { title: "Red óptica y FTTH", links: [
      { label: "Soluciones de Preconectorizado", href: "/tienda/soluciones-de-preconectorizado" },
      { label: "Cajas de Distribución y Emplazamiento", href: "/tienda/cajas-de-distribucion-y-emplazamiento" },
      { label: "Soluciones activas y Accesorios FTTH", href: "/tienda/soluciones-activas-y-accesorios-ftth" },
      { label: "Componentes pasivos", href: "/tienda/componentes-pasivos" },
      { label: "Microcables y Microproductos", href: "/tienda/microcables-y-microproductos" }
    ]},
    { title: "Infraestructura", links: [
      { label: "Gabinetes y Racks", href: "/tienda/gabinetes-y-racks" },
      { label: "Herrajes", href: "/tienda/herrajes" },
      { label: "Escaleras", href: "/tienda/escaleras" },
      { label: "Optical Distribution Frame - ODF", href: "/tienda/optical-distribution-frame-odf" }
    ]},
    { title: "Medición y herramientas", links: [
      { label: "Instrumentos de medición óptica", href: "/tienda/instrumentos-de-medicion-optica" },
      { label: "Herramientas y kits", href: "/tienda/herramientas-y-kits" }
    ]},
    { title: "Más de Arconet", links: [
      { label: "La empresa", href: "/#empresa" },
      { label: "Misión y visión", href: "/#mision" },
      { label: "Términos de uso", href: "/terminos" }
    ]}
  ]},
  { label: "Tienda", href: "/tienda", mega: false },
  { id: "empresa", label: "La empresa", href: "#empresa", mega: false },
  { id: "compania", label: "Nosotros", href: "#compania", mega: false },
  { label: "Contacto", href: "/contacto", mega: false },
];

// Fuera del home, las anclas deben volver a la portada para encontrar su
// sección. Categoría y producto comparten esta misma configuración.
export const STORE_NAVIGATION = NAVIGATION.map((item) => ({
  ...item,
  href: item.href.startsWith("#") ? `/${item.href}` : item.href,
}));
