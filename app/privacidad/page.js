import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import Footer from "../footer";
import styles from "../terminos/terminos-experience.module.css";
import { CONTACT_EMAIL } from "../../lib/contact";
import MobileSiteMenu from "../mobile-site-menu";

export const metadata = {
  title: "Aviso de privacidad",
  description:
    "Conoce qué datos utiliza Arconet en su sitio web, para qué los usa y cómo solicitar acceso, corrección o eliminación.",
  alternates: { canonical: "/privacidad" },
};

const sections = [
  {
    id: "responsable",
    number: "01",
    label: "Responsable y alcance",
    title: "Quién gestiona tus datos.",
    paragraphs: [
      "Arconet, S.A., empresa con sede en San Pedro Sula, Honduras, gestiona los datos personales que se reciben a través de arconethn.com y del portal de clientes. Este aviso explica el uso actual de los datos en esas funciones.",
      "Este aviso no describe los tratamientos que puedan realizar terceros desde sus propios sitios o servicios. Si sigues un enlace externo, revisa las políticas del proveedor correspondiente.",
    ],
  },
  {
    id: "datos",
    number: "02",
    label: "Datos que recibimos",
    title: "Solo la información necesaria para atenderte.",
    paragraphs: [
      "Al crear una cuenta podemos recibir nombre, empresa y correo electrónico; el teléfono es opcional. El perfil de cliente también puede contener RTN, ciudad, dirección y datos de contacto si se proporcionan durante la relación comercial.",
      "Cuando envías una solicitud desde el portal, recibimos el nombre del proyecto, tipo y urgencia de la solicitud, descripción y, si lo indicas, presupuesto estimado. Los datos comerciales de cotizaciones y órdenes se asocian a la cuenta para darles seguimiento.",
      "La contraseña se conserva como una representación criptográfica para verificar el acceso; no se guarda en texto legible. El sistema también registra eventos de acceso y actividad necesarios para proteger y administrar el servicio.",
    ],
  },
  {
    id: "uso",
    number: "03",
    label: "Cómo usamos la información",
    title: "Atender solicitudes y operar el portal.",
    paragraphs: [
      "Utilizamos los datos para crear y administrar cuentas de clientes, verificar el acceso, atender solicitudes de cotización, mantener el historial comercial y responder consultas de soporte. También se usan para proteger el servicio, detectar intentos de acceso indebidos y mantener registros operativos.",
      "El formulario público de contacto prepara un mensaje en la aplicación de correo de tu dispositivo. El sitio no envía ni guarda ese mensaje; si eliges enviarlo, el correo se procesa mediante tu proveedor de correo y llega a Arconet.",
      "No utilizamos el portal para vender datos personales ni para publicidad conductual. Si este uso cambia, actualizaremos el aviso antes de aplicar el cambio correspondiente.",
    ],
  },
  {
    id: "almacenamiento",
    number: "04",
    label: "Almacenamiento y terceros",
    title: "Acceso limitado a la operación del servicio.",
    paragraphs: [
      "Los datos de cuentas y solicitudes se guardan en la base de datos que utiliza el sitio. Personal autorizado de Arconet y proveedores técnicos que operan el sitio o su infraestructura pueden acceder a ellos solo en la medida necesaria para prestar, mantener y proteger el servicio.",
      "Podemos comunicar información cuando sea necesario para atender una solicitud, cumplir un requerimiento legal válido o proteger los derechos y la seguridad de las personas y del servicio. No publicamos tus datos de contacto.",
    ],
  },
  {
    id: "conservacion",
    number: "05",
    label: "Conservación y seguridad",
    title: "Protección durante el tiempo necesario.",
    paragraphs: [
      "Conservamos la información mientras la cuenta o la solicitud esté activa y durante el tiempo adicional necesario para dar seguimiento a la relación comercial, mantener registros operativos o atender obligaciones aplicables. El período concreto depende del tipo de registro y de su finalidad.",
      "Aplicamos controles técnicos para proteger las cuentas y restringir el acceso. Ninguna transmisión o almacenamiento en internet puede garantizarse como absolutamente seguro; si detectas un problema con tu cuenta, contáctanos de inmediato.",
    ],
  },
  {
    id: "cookies",
    number: "06",
    label: "Cookies y almacenamiento local",
    title: "Preferencias que mantienen el sitio funcionando.",
    paragraphs: [
      "El inicio de sesión utiliza una cookie técnica para mantener la sesión. La cookie está protegida para que no sea legible desde JavaScript y se limita al uso del sitio; según la opción de sesión elegida, dura hasta ocho horas o hasta siete días.",
      "El navegador también guarda preferencias funcionales en almacenamiento local: el contenido del carrito, la sucursal seleccionada y el tema visual. Estos datos se quedan en tu dispositivo y puedes eliminarlos desde la configuración del navegador. El sitio no instala actualmente cookies publicitarias ni herramientas de analítica de terceros.",
    ],
  },
  {
    id: "solicitudes",
    number: "07",
    label: "Solicitudes sobre tus datos",
    title: "Pide acceso, corrección o eliminación.",
    paragraphs: [
      "Puedes solicitar acceso a los datos asociados a tu cuenta, corregir información inexacta, cerrar la cuenta o pedir que se eliminen datos que ya no sean necesarios. Algunas constancias de cotización u operación podrían conservarse cuando sea necesario para cerrar gestiones pendientes o atender obligaciones aplicables; te explicaremos si una solicitud no puede atenderse por completo.",
      `Para realizar una solicitud, escribe a ${CONTACT_EMAIL} desde el correo asociado a tu cuenta e indica qué necesitas. Podemos pedir información razonable para verificar que eres titular de la cuenta antes de revelar o modificar sus datos.`,
    ],
  },
  {
    id: "actualizaciones",
    number: "08",
    label: "Actualizaciones",
    title: "Te informaremos cuando cambie el aviso.",
    paragraphs: [
      "Podemos actualizar este aviso para reflejar cambios en el sitio o en el uso de datos. La fecha de actualización aparecerá en esta página. Si un cambio requiere una decisión tuya, lo comunicaremos en el punto correspondiente.",
    ],
  },
];

export default function PrivacyPage() {
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
              <Link className={styles.navigationActive} href="/privacidad" aria-current="page">Privacidad</Link>
              <Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}>
              <MobileSiteMenu />
              <Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link>
            </div>
          </header>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Privacidad y datos · Arconet Honduras</p>
            <h1>Tu información<br />merece <em>claridad.</em></h1>
            <p>Conoce qué información utiliza el sitio y cómo solicitar acceso, corrección o eliminación.</p>
            <Link className={styles.heroAction} href="#aviso">Leer el aviso <span><ArrowDown size={16} /></span></Link>
          </div>
          <div className={styles.heroFooter}>
            <span>AVISO DE PRIVACIDAD DEL SITIO Y PORTAL DE CLIENTES</span>
            <span>ACTUALIZADO · 23 OCT 2026</span>
          </div>
        </section>
      </div>

      <div id="aviso" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Secciones del aviso de privacidad">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{section.number}</span>{section.label}
              </a>
            ))}
          </nav>
          <p className={styles.asideNote}><ShieldCheck size={14} /> ¿Tienes una consulta? <Link href={`mailto:${CONTACT_EMAIL}`}>Escríbenos</Link>.</p>
        </aside>

        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}>
            <span>ARCONET · AVISO DE PRIVACIDAD</span>
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
            <Link href="/contacto">Contactar a Arconet <ArrowRight size={15} /></Link>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}
