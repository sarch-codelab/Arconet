import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Cookie } from "lucide-react";
import Footer from "../footer";
import styles from "../terminos/terminos-experience.module.css";
import { CONTACT_EMAIL } from '@/lib/contact';
import MobileSiteMenu from "../mobile-site-menu";

export const metadata = {
  title: "Política de cookies",
  description:
    "Información sobre las cookies que utiliza Arconet en su sitio web y cómo gestionarlas.",
  alternates: { canonical: "/cookies" },
};

const sections = [
  {
    id: "que-son",
    number: "01",
    label: "¿Qué son las cookies?",
    title: "Pequeños archivos de texto que mejoran tu experiencia.",
    paragraphs: [
      "Las cookies son pequeños archivos de texto que los sitios web envían a tu navegador. Se almacenan en tu dispositivo y se envían de vuelta al sitio en cada visita posterior. Nos permiten recordar tus preferencias y mantener funcionalidades básicas del sitio.",
      "Las cookies que utilizamos son estrictamente necesarias para el funcionamiento del sitio. No utilizamos cookies publicitarias ni de seguimiento de terceros.",
    ],
  },
  {
    id: "tipos",
    number: "02",
    label: "Tipos de cookies que utilizamos",
    title: "Solo cookies técnicas y funcionales.",
    paragraphs: [
      "Cookies de sesión: Mantienen tu inicio de sesión activo mientras navegas. Son temporales y se eliminan cuando cierras el navegador o al finalizar la sesión (según la opción que elijas). Están protegidas para que no sean legibles desde JavaScript.",
      "Almacenamiento local: Guardamos preferencias funcionales en tu navegador, como el contenido del carrito de compras, la sucursal seleccionada y el tema visual (claro/oscuro). Estos datos permanecen en tu dispositivo y puedes eliminarlos desde la configuración del navegador.",
    ],
  },
  {
    id: "proposito",
    number: "03",
    label: "Para qué las usamos",
    title: "Funcionalidad básica y preferencias del usuario.",
    paragraphs: [
      "Las cookies de sesión permiten que permanezcas identificado mientras navegas por el sitio sin tener que volver a iniciar sesión en cada página. Esto es necesario para acceder a tu cuenta, enviar solicitudes y utilizar el portal de clientes.",
      "El almacenamiento local recuerda tu carrito de productos seleccionados, la sucursal que prefieres y tu elección de tema visual. Esto mejora tu experiencia al visitar el sitio nuevamente.",
    ],
  },
  {
    id: "terceros",
    number: "04",
    label: "Cookies de terceros",
    title: "No utilizamos cookies de seguimiento.",
    paragraphs: [
      "Arconet no instala cookies publicitarias, de analítica ni de seguimiento de terceros en su sitio web. No compartimos información de navegación con redes publicitarias ni servicios de análisis externos.",
      "Si el sitio incluye contenido de terceros (como imágenes o scripts externos), esos proveedores pueden tener sus propias políticas de cookies. Te recomendamos revisar las políticas de cualquier servicio externo que visites desde enlaces en nuestro sitio.",
    ],
  },
  {
    id: "gestion",
    number: "05",
    label: "Cómo gestionar las cookies",
    title: "Puedes controlarlas desde tu navegador.",
    paragraphs: [
      "Puedes configurar tu navegador para aceptar, rechazar o eliminar cookies. La mayoría de navegadores permiten ver y eliminar cookies existentes en la configuración de privacidad o seguridad.",
      "Ten en cuenta que si deshabilitas las cookies de sesión, no podrás iniciar sesión ni utilizar el portal de clientes, ya que estas cookies son necesarias para el funcionamiento básico del sitio.",
      "Para eliminar el almacenamiento local (carrito, tema, sucursal), puedes borrar los datos del sitio desde la configuración de tu navegador o usar el modo privado/incógnito para navegar sin guardar preferencias.",
    ],
  },
  {
    id: "contacto",
    number: "06",
    label: "¿Tienes preguntas?",
    title: "Estamos disponibles para ayudarte.",
    paragraphs: [
      `Si tienes dudas sobre esta política de cookies o sobre cómo funcionan las cookies en nuestro sitio, puedes escribirnos a ${CONTACT_EMAIL}. Te responderemos a la brevedad posible.`,
    ],
  },
];

export default function CookiesPage() {
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
              <Link className={styles.navigationActive} href="/cookies" aria-current="page">Cookies</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Política de cookies · Arconet Honduras</p>
            <h1>Transparencia<br />en <em>tu navegación.</em></h1>
            <p>Información clara sobre las cookies que utilizamos y cómo controlarlas.</p>
            <Link className={styles.heroAction} href="#politica">Leer política <span><ArrowDown size={16} /></span></Link>
          </div>
          <div className={styles.heroFooter}>
            <span>POLÍTICA DE COOKIES DEL SITIO</span>
            <span>ACTUALIZADO · 23 OCT 2026</span>
          </div>
        </section>
      </div>

      <div id="politica" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Secciones de la política de cookies">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{section.number}</span>{section.label}
              </a>
            ))}
          </nav>
          <p className={styles.asideNote}><Cookie size={14} /> ¿Tienes dudas? <Link href={`mailto:${CONTACT_EMAIL}`}>Escríbenos</Link>.</p>
        </aside>

        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}>
            <span>ARCONET · POLÍTICA DE COOKIES</span>
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
              <Link href={`mailto:${CONTACT_EMAIL}`}>Escribir a soporte <ArrowRight size={15} /></Link>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}
