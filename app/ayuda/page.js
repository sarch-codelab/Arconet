import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "../terminos/terminos-experience.module.css";
import Footer from "../footer";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../lib/contact";
import MobileSiteMenu from "../mobile-site-menu";

export const metadata = {
  title: "Ayuda y preguntas frecuentes",
  description: "Respuestas sobre cuentas, acceso al portal de clientes, cotizaciones y soporte de Arconet.",
  alternates: { canonical: "/ayuda" },
};

const FAQ = [
  ["registro", "¿Cómo creo una cuenta de cliente?", <>Completa el formulario de <Link href="/registro">registro</Link> con tu nombre, correo y contraseña de al menos 12 caracteres. El nombre de empresa es opcional. Al crear la cuenta podrás entrar al portal y enviar solicitudes de cotización.</>],
  ["acceso", "¿Qué hago si mi correo ya aparece registrado?", <>Por seguridad, un correo asociado a un registro comercial debe ser habilitado por Arconet para acceder al portal. Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> y solicita activar tu acceso.</>],
  ["contrasena", "¿Puedo restablecer mi contraseña desde el sitio?", <>El sitio no tiene recuperación automática de contraseña. Contáctanos desde el correo de tu cuenta en <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Ayuda para recuperar acceso al portal")}`}>{CONTACT_EMAIL}</a> para recibir asistencia.</>],
  ["cotizacion", "¿Enviar una solicitud confirma una compra?", <>No. La solicitud inicia una revisión comercial; no confirma precio, disponibilidad, reserva ni compra. Los detalles se acuerdan en una cotización escrita. Consulta también los <Link href="/terminos">términos de uso</Link>.</>],
  ["portal", "¿Dónde puedo ver mis solicitudes y proyectos?", <>Inicia sesión en el <Link href="/login">portal de clientes</Link>. Ahí puedes consultar tus solicitudes y la información que Arconet haya habilitado para tu cuenta.</>],
  ["documentos", "¿Dónde encuentro los documentos de mi proyecto?", <>Los documentos aparecen en el portal cuando Arconet los comparte con tu cuenta. Si necesitas un documento específico, solicítalo por correo o teléfono.</>],
  ["condiciones", "¿Cómo se confirman entregas, pagos y garantías?", <>Las condiciones dependen de cada producto o proyecto y se detallan en la cotización, factura o documentación aplicable. Puedes aclararlas con el equipo comercial antes de aceptar.</>],
  ["contacto", "¿Cómo envío una consulta general?", <>El formulario de <Link href="/contacto">contacto</Link> prepara un mensaje en tu aplicación de correo. También puedes escribir a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> o llamar al <a href={`tel:${CONTACT_PHONE.replace(/[^+\d]/g, "")}`}>{CONTACT_PHONE}</a>.</>],
];

export default function AyudaPage() {
  return (
    <main className={styles.termsPage}>
      <div className={styles.heroFrame}>
        <section id="inicio" className={styles.heroCard}>
          <div className={styles.heroBackground}>
            <Image src="/escudo-digital.webp" alt="" fill priority sizes="100vw" className={styles.heroImage} />
            <div className={styles.heroOverlay} />
          </div>
          <header className={styles.heroHeader}>
            <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio"><Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority /></Link>
            <nav className={styles.navigation} aria-label="Navegación principal">
              <Link href="/">Inicio</Link><Link href="/catalogo">Catálogo</Link><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/contacto">Contacto</Link>
            </nav>
            <div className={styles.headerActionTab}><MobileSiteMenu /><Link className={styles.headerAction} href="/contacto">Hablemos <span><ArrowUpRight size={15} /></span></Link></div>
          </header>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i /> Centro de ayuda · Arconet Honduras</p>
            <h1>Respuestas claras<br />para <em>seguir conectado.</em></h1>
            <p>Información práctica sobre tu cuenta, el portal de clientes y las cotizaciones.</p>
            <Link className={styles.heroAction} href="#preguntas">Ver preguntas <span><ArrowDown size={16} /></span></Link>
          </div>
          <div className={styles.heroFooter}><span>CUENTAS · COTIZACIONES · SOPORTE</span><span>{FAQ.length} PREGUNTAS FRECUENTES</span></div>
        </section>
      </div>
      <div id="preguntas" className={styles.documentLayout}>
        <aside className={styles.contentsAside}>
          <p className={styles.contentsLabel}>EN ESTA PÁGINA</p>
          <nav className={styles.contentsNav} aria-label="Preguntas frecuentes">
            {FAQ.map(([id, question], index) => <a key={id} href={`#${id}`}><span>{String(index + 1).padStart(2, "0")}</span>{question}</a>)}
          </nav>
          <p className={styles.asideNote}>¿No encuentras tu respuesta? Contáctanos y te ayudaremos.</p>
        </aside>
        <article className={styles.termsArticle}>
          <div className={styles.documentMeta}><span>ARCONET · CENTRO DE AYUDA</span><span>PORTAL Y SERVICIOS</span></div>
          {FAQ.map(([id, question, answer], index) => (
            <section id={id} className={styles.termSection} key={id}>
              <div className={styles.termNumber}>{String(index + 1).padStart(2, "0")}</div>
              <div className={styles.termContent}><p className={styles.termLabel}>Pregunta frecuente</p><h2>{question}</h2><p className={styles.termParagraph}>{answer}</p></div>
            </section>
          ))}
          <div className={styles.documentEnd}><span>ARCONET, S.A. · SAN PEDRO SULA, HONDURAS</span><div><Link href="/privacidad">Aviso de privacidad</Link><Link href={`mailto:${CONTACT_EMAIL}`}>Escribir a soporte <ArrowRight size={15} /></Link></div></div>
        </article>
      </div>
      <Footer />
    </main>
  );
}
