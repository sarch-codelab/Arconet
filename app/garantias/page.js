import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import Footer from "../footer";
import styles from "../terminos/terminos-experience.module.css";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../lib/contact";
import MobileSiteMenu from "../mobile-site-menu";

export const metadata = {
  title: "Garantías y devoluciones",
  description:
    "Política de garantías, condiciones de devolución y soporte técnico para productos de Arconet.",
  alternates: { canonical: "/garantias" },
};

const sections = [
  {
    id: "alcance",
    number: "01",
    label: "Alcance de la política",
    title: "Aplicable a productos del catálogo.",
    paragraphs: [
      "Esta política de garantías y devoluciones se aplica a los equipos y productos comercializados por Arconet a través de su catálogo y cotizaciones comerciales. Las condiciones específicas pueden variar según el tipo de producto, fabricante y acuerdos comerciales.",
      "Las garantías mencionadas se complementan con las condiciones estipuladas en cada cotización, factura o contrato específico. En caso de discrepancia, prevalecerán las condiciones acordadas en el documento de venta.",
    ],
  },
  {
    id: "garantia-fabricante",
    number: "02",
    label: "Garantía de fabricante",
    title: "Cobertura según el fabricante.",
    paragraphs: [
      "La mayoría de productos del catálogo incluyen la garantía original del fabricante. El período y condiciones de esta garantía varían según el fabricante y el tipo de producto. Esta información se especifica en la ficha técnica del producto y se confirma en la cotización.",
      "La garantía de fabricante cubre defectos de materiales y mano de obra bajo uso normal. No cubre daños por uso indebido, modificaciones no autorizadas, accidentes o desastres naturales.",
    ],
  },
  {
    id: "garantia-arconet",
    number: "03",
    label: "Garantía de instalación",
    title: "Servicio profesional certificado.",
    paragraphs: [
      "Cuando Arconet realiza la instalación de equipos, proporciona una garantía sobre el servicio de instalación. Esta garantía cubre defectos de instalación que afecten el funcionamiento normal del equipo, siempre que la instalación se haya realizado según las especificaciones del fabricante y las buenas prácticas de la industria.",
      "La garantía de instalación tiene un período definido según el tipo de servicio, que se especifica en la cotización o contrato correspondiente. Los problemas causados por factores externos (daños en la infraestructura existente, interferencias, etc.) pueden no estar cubiertos.",
    ],
  },
  {
    id: "soporte",
    number: "04",
    label: "Soporte técnico",
    title: "Asistencia durante la garantía.",
    paragraphs: [
      `Durante el período de garantía, Arconet proporciona soporte técnico para diagnosticar y resolver problemas cubiertos por la garantía. Puedes contactarnos por correo electrónico en ${CONTACT_EMAIL} o por teléfono al ${CONTACT_PHONE}.`,
      "El soporte técnico puede incluir diagnóstico remoto, visita técnica según el tipo de producto y ubicación, o coordinación con el fabricante para soluciones de garantía. Los tiempos de respuesta se especifican en los acuerdos comerciales.",
    ],
  },
  {
    id: "devoluciones",
    number: "05",
    label: "Devoluciones y cambios",
    title: "Condiciones específicas por producto.",
    paragraphs: [
      "Las devoluciones o cambios de productos se evalúan caso por caso. Productos no instalados y en su empaque original pueden ser elegibles para devolución dentro de un período específico, sujeto a costo de re-stock y disponibilidad.",
      "Productos ya instalados o usados generalmente no son elegibles para devolución, salvo defecto de fábrica confirmado dentro del período de garantía. En estos casos, se procede según la política de garantía del fabricante.",
      "Para solicitar una devolución o cambio, contacta a nuestro equipo comercial o de soporte técnico para evaluar el caso. Cada solicitud se revisa considerando el tipo de producto, tiempo transcurrido, causa de la devolución y condiciones del acuerdo comercial.",
    ],
  },
  {
    id: "proceso",
    number: "06",
    label: "Proceso de reclamación",
    title: "Cómo reportar un problema.",
    paragraphs: [
      "Si experimentas un problema con un producto o servicio, repórtalo lo antes posible. Incluye descripción detallada del problema, número de orden o factura, y si es posible, fotografías o evidencia del problema.",
      "Nuestro equipo técnico evaluará el reporte y determinará si el problema está cubierto por garantía. Si aplica, coordinaremos la reparación, reemplazo o devolución según corresponda. Los tiempos de resolución varían según el tipo de problema y disponibilidad de repuestos.",
    ],
  },
  {
    id: "exclusiones",
    number: "07",
    label: "Exclusiones de garantía",
    title: "Casos no cubiertos.",
    paragraphs: [
      "La garantía no cubre daños causados por uso indebido, instalación incorrecta por terceros no autorizados, modificaciones al producto, accidentes, desastres naturales, o falta de mantenimiento adecuado según las especificaciones del fabricante.",
      "Tampoco cubre productos que hayan sido alterados, reparados o modificados sin autorización de Arconet o del fabricante, ni problemas causados por incompatibilidad con otros equipos o sistemas no especificados en la instalación original.",
    ],
  },
  {
    id: "contacto",
    number: "08",
    label: "¿Tienes preguntas?",
    title: "Estamos para ayudarte.",
    paragraphs: [
      `Si tienes dudas sobre esta política de garantías y devoluciones, o necesitas aclaraciones sobre un producto específico, contáctanos. Puedes escribirnos a ${CONTACT_EMAIL} o llamar al ${CONTACT_PHONE}.`,
      "Para consultas sobre garantías de productos específicos, te recomendamos revisar la ficha técnica del producto o solicitar la información directamente en tu cotización.",
    ],
  },
];

export default function GarantiasPage() {
  return (
    <main className={styles.termsPage}>
      <div className={styles.heroFrame}>
        <section className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image src="/escudo-digital.webp" alt="" fill priority sizes="100vw" className={styles.heroImage} />
            <div className={styles.heroOverlay} />
          </div>
          <header className={styles.heroHeader}>
            <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
              <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
            </Link>
            <nav className={styles.navigation} aria-label="Navegación principal">
              <Link href="/">Inicio</Link>
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/terminos">Términos</Link>
              <Link href="/privacidad">Privacidad</Link>
              <Link className={styles.navigationActive} href="/garantias" aria-current="page">Garantías</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Garantías y devoluciones · Arconet Honduras</p>
            <h1>Protección para<br /><em>tu inversión.</em></h1>
            <p>Conoce nuestras políticas de garantía, soporte técnico y devoluciones.</p>
            <Link className={styles.heroAction} href="#politica">Leer política <span><ArrowDown size={16} /></span></Link>
          </div>
          <div className={styles.heroFooter}>
            <span>POLÍTICA DE GARANTÍAS Y DEVOLUCIONES</span>
            <span>ACTUALIZADO · 23 OCT 2026</span>
          </div>
        </section>
      </div>

      <div id="politica" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Secciones de la política de garantías">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{section.number}</span>{section.label}
              </a>
            ))}
          </nav>
          <p className={styles.asideNote}><ShieldCheck size={14} /> ¿Necesitas ayuda técnica? <Link href={`mailto:${CONTACT_EMAIL}`}>Escríbenos</Link>.</p>
        </aside>

        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}>
            <span>ARCONET · POLÍTICA DE GARANTÍAS</span>
            <span>ÚLTIMA ACTUALIZACIÓN · 23.10.2026</span>
          </div>
          {sections.map((section) => (
            <section id={section.id} className={styles.termSection} key={section.id}>
              <div className={styles.termNumber}>{section.number}</div>
              <div className={styles.termContent}>
                <p className={styles.termLabel}>{section.label}</p>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p className={styles.termParagraph} key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
          <div className={styles.documentEnd}>
            <span>ARCONET, S.A. · SAN PEDRO SULA, HONDURAS</span>
            <div>
              <Link href="/privacidad">Aviso de privacidad</Link>
              <Link href="/terminos">Términos de uso</Link>
              <Link href="/aviso-legal">Aviso legal</Link>
              <Link href={`mailto:${CONTACT_EMAIL}`}>Escribir a soporte <ArrowRight size={15} /></Link>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}
