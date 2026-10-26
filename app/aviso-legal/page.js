import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Building2 } from "lucide-react";
import Footer from "../footer";
import styles from "../terminos/terminos-experience.module.css";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../lib/contact";
import MobileSiteMenu from "../mobile-site-menu";

export const metadata = {
  title: "Aviso legal",
  description:
    "Información legal y datos de identificación de Arconet, S.A. en Honduras.",
  alternates: { canonical: "/aviso-legal" },
};

const sections = [
  {
    id: "identidad",
    number: "01",
    label: "Datos de identificación",
    title: "Arconet, S.A.",
    paragraphs: [
      "Arconet, S.A. es una empresa constituida legalmente en la República de Honduras, dedicada al diseño, instalación y comercialización de soluciones de telecomunicaciones, fibra óptica, CATV e infraestructura de red.",
      "Nuestra razón social, domicilio social y datos de contacto están disponibles para cualquier consulta formal o requerimiento legal.",
    ],
  },
  {
    id: "domicilio",
    number: "02",
    label: "Domicilio social",
    title: "San Pedro Sula, Honduras",
    paragraphs: [
      "Nuestra sede principal se encuentra en San Pedro Sula, departamento de Cortés, Honduras. Desde esta ubicación operamos y prestamos servicios a nivel nacional.",
      "Para visitas presenciales con cita previa, por favor contáctanos previamente a través de los canales oficiales de contacto.",
    ],
  },
  {
    id: "contacto",
    number: "03",
    label: "Información de contacto",
    title: "Canales oficiales de comunicación",
    paragraphs: [
      `Puedes contactarnos por correo electrónico en ${CONTACT_EMAIL} o por teléfono al ${CONTACT_PHONE}. Estos son nuestros canales oficiales para consultas comerciales, soporte técnico y atención al cliente.`,
      "El formulario de contacto en este sitio prepara un mensaje en tu aplicación de correo electrónico. Si decides enviarlo, el mensaje se procesa a través de tu proveedor de correo y llega a nuestros canales oficiales.",
    ],
  },
  {
    id: "registro",
    number: "04",
    label: "Registro mercantil",
    title: "Inscripción en registros públicos",
    paragraphs: [
      "Arconet, S.A. está debidamente inscrita en los registros mercantiles correspondientes de la República de Honduras. Nuestra información está disponible para consulta en los registros públicos oficiales.",
      "Los documentos legales, licencias de operación y permisos aplicables se encuentran actualizados y al día conforme a la legislación hondureña vigente.",
    ],
  },
  {
    id: "propiedad",
    number: "05",
    label: "Propiedad intelectual",
    title: "Derechos sobre el sitio y contenido",
    paragraphs: [
      "Este sitio web, su diseño, estructura, código fuente, textos, imágenes, logotipos y demás elementos son propiedad exclusiva de Arconet, S.A., salvo que se indique lo contrario. Todos los derechos están reservados.",
      "El nombre comercial 'Arconet', los logotipos y cualquier marca distintiva asociada son propiedad de Arconet, S.A. Queda prohibida su reproducción, modificación, distribución o uso sin autorización expresa y por escrito.",
    ],
  },
  {
    id: "responsabilidad",
    number: "06",
    label: "Limitación de responsabilidad",
    title: "Uso del sitio e información",
    paragraphs: [
      "Arconet, S.A. se esfuerza por mantener la información en este sitio actualizada y precisa. Sin embargo, no garantiza la exactitud, integridad o actualidad del contenido, ni asume responsabilidad por errores u omisiones.",
      "El acceso y uso de este sitio es bajo la responsabilidad del usuario. Arconet, S.A. no será responsable de daños directos, indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de usar este sitio.",
      "Los enlaces a sitios de terceros se proporcionan por conveniencia del usuario. Arconet, S.A. no controla estos sitios y no asume responsabilidad por su contenido, políticas de privacidad o prácticas.",
    ],
  },
  {
    id: "jurisdiccion",
    number: "07",
    label: "Jurisdicción aplicable",
    title: "Leyes y tribunales de Honduras",
    paragraphs: [
      "Este aviso legal y el uso de este sitio se rigen por las leyes de la República de Honduras. Cualquier controversia derivada del acceso o uso de este sitio se someterá a los tribunales competentes de San Pedro Sula, Cortés, Honduras.",
      "El usuario reconoce que el acceso a este sitio desde otros países es bajo su propia responsabilidad y debe cumplir con las leyes locales aplicables.",
    ],
  },
  {
    id: "actualizaciones",
    number: "08",
    label: "Actualizaciones",
    title: "Modificaciones del aviso legal",
    paragraphs: [
      "Arconet, S.A. se reserva el derecho de modificar este aviso legal en cualquier momento para reflejar cambios en la empresa, la legislación aplicable o el sitio web. Las modificaciones entrarán en vigor desde su publicación en esta página.",
      "Se recomienda revisar periódicamente este aviso legal para estar informado de cualquier cambio.",
    ],
  },
];

export default function AvisoLegalPage() {
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
              <Link className={styles.navigationActive} href="/aviso-legal" aria-current="page">Aviso legal</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Información legal · Arconet Honduras</p>
            <h1>Transparencia<br /><em>jurídica.</em></h1>
            <p>Datos de identificación y información legal de Arconet, S.A.</p>
            <Link className={styles.heroAction} href="#aviso">Leer aviso <span><ArrowDown size={16} /></span></Link>
          </div>
          <div className={styles.heroFooter}>
            <span>AVISO LEGAL · ARCONET, S.A.</span>
            <span>ACTUALIZADO · 23 OCT 2026</span>
          </div>
        </section>
      </div>

      <div id="aviso" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Secciones del aviso legal">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{section.number}</span>{section.label}
              </a>
            ))}
          </nav>
          <p className={styles.asideNote}><Building2 size={14} /> ¿Necesitas información formal? <Link href={`mailto:${CONTACT_EMAIL}`}>Escríbenos</Link>.</p>
        </aside>

        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}>
            <span>ARCONET, S.A. · AVISO LEGAL</span>
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
              <Link href="/cookies">Política de cookies</Link>
              <Link href={`mailto:${CONTACT_EMAIL}`}>Escribir a soporte <ArrowRight size={15} /></Link>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}
