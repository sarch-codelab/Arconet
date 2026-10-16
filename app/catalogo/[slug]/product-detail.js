"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Handshake,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { FAMILIES, findFamily } from "../catalogo-data";
import styles from "./product-detail.module.css";

const NAVIGATION = [
  { href: "/catalogo#familias", label: "Soluciones" },
  { href: "/catalogo#catalogo-items", label: "Catálogo" },
  { href: "/catalogo#acompanamiento", label: "Acompañamiento" },
  { href: "/#contacto", label: "Contacto" },
];

const PRESENTATIONS = ["Unidad", "Caja", "Proyecto completo"];

const TABS = [
  { id: "detalles", label: "Detalles" },
  { id: "especificaciones", label: "Especificaciones" },
  { id: "aplicaciones", label: "Aplicaciones" },
  { id: "soporte", label: "Soporte y entrega" },
];

const SUPPORT_ITEMS = [
  { icon: PackageCheck, title: "Importación directa", text: "Traemos el equipo sin intermediarios de más." },
  { icon: Handshake, title: "Asesoría antes de comprar", text: "Revisamos tu proyecto y te recomendamos lo que sí sirve." },
  { icon: Truck, title: "Entrega en Honduras", text: "Coordinamos la entrega donde esté tu instalación." },
  { icon: ShieldCheck, title: "Soporte después de la compra", text: "Seguimos disponibles durante la instalación." },
];

function ProductVisual({ item, className }) {
  if (!item.src) {
    return (
      <div className={`${styles.graphic} ${className || ""}`} aria-hidden="true">
        <div className={styles.graphicOrbit}><i /><i /><i /></div>
        <span>ARCONET</span>
      </div>
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.alt}
      fill
      sizes="(max-width: 900px) 92vw, 46vw"
      className={`${styles.galleryImage} ${item.fit === "contain" ? styles.fitContain : styles.fitCover} ${className || ""}`}
    />
  );
}

export default function ProductDetail({ slug }) {
  const family = findFamily(slug);
  const [activeTab, setActiveTab] = useState("detalles");
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [presentation, setPresentation] = useState(PRESENTATIONS[0]);

  if (!family) {
    return (
      <main className={styles.missing}>
        <p className={styles.eyebrow}>Catálogo Arconet</p>
        <h1>No encontramos esa línea.</h1>
        <p>Puede que haya cambiado de nombre. Te ayudamos a encontrarla en un minuto.</p>
        <div className={styles.missingActions}>
          <Link className={styles.primaryButton} href="/catalogo">Volver al catálogo <ArrowRight size={16} /></Link>
          <Link className={styles.ghostDarkButton} href="/#contacto">Escribir al equipo <ArrowUpRight size={16} /></Link>
        </div>
      </main>
    );
  }

  const gallery = family.gallery || [{ src: family.image, alt: family.imageAlt, fit: "contain", caption: "Producto" }];
  const current = gallery[Math.min(activeImage, gallery.length - 1)];
  const related = FAMILIES.filter((item) => item.id !== family.id).slice(0, 3);
  const Icon = family.icon;

  return (
    <main className={styles.detail}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
        </Link>
        <nav className={styles.nav} aria-label="Navegación principal">
          {NAVIGATION.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <Link className={styles.headerAction} href="/#contacto">
          Hablemos <span><ArrowUpRight size={15} /></span>
        </Link>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/catalogo">Catálogo</Link>
        <ChevronRight size={13} aria-hidden="true" />
        {family.category !== family.title && (
          <>
            <Link href="/catalogo#catalogo-items">{family.category}</Link>
            <ChevronRight size={13} aria-hidden="true" />
          </>
        )}
        <span>{family.title}</span>
      </div>

      <section className={styles.product}>
        <div className={styles.gallery}>
          <div className={styles.thumbs} role="group" aria-label="Imágenes del producto">
            {gallery.map((item, index) => (
              <button
                type="button"
                key={`${item.src || "grafico"}-${index}`}
                className={activeImage === index ? styles.thumbActive : ""}
                aria-label={`Ver imagen ${index + 1}: ${item.caption}`}
                aria-pressed={activeImage === index}
                onClick={() => setActiveImage(index)}
              >
                {item.src ? (
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    sizes="84px"
                    className={`${styles.galleryImage} ${item.fit === "contain" ? styles.fitContain : styles.fitCover}`}
                  />
                ) : (
                  <span className={styles.thumbGraphic} aria-hidden="true"><Icon size={20} /></span>
                )}
              </button>
            ))}
          </div>

          <figure className={styles.stage}>
            <ProductVisual item={current} />
            <figcaption>
              <span>{current.caption}</span>
              <span>{family.index} / {String(gallery.length).padStart(2, "0")}</span>
            </figcaption>
          </figure>
        </div>

        <div className={styles.info}>
          <span className={styles.badge}>{family.badge}</span>
          <h1>{family.title}</h1>
          <p className={styles.metaLine}>
            <Icon size={15} aria-hidden="true" /> {family.category} · Línea {family.index}
          </p>

          <p className={styles.price}>Cotización a la medida</p>
          <p className={styles.priceNote}>El precio depende del volumen y la configuración. Te respondemos el mismo día.</p>

          <p className={styles.description}>{family.summary} {family.description}</p>

          <ul className={styles.featureList}>
            {family.items.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>

          <div className={styles.configBox}>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>Presentación</span>
              <div className={styles.chips} role="group" aria-label="Elegir presentación">
                {PRESENTATIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={presentation === option ? styles.chipActive : ""}
                    aria-pressed={presentation === option}
                    onClick={() => setPresentation(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.configRow}>
              <span className={styles.configLabel}>Cantidad</span>
              <div className={styles.stepper}>
                <button type="button" aria-label="Restar una unidad" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Sumar una unidad" onClick={() => setQuantity((value) => value + 1)}>
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/#contacto">
              Solicitar cotización <span><ArrowUpRight size={16} /></span>
            </Link>
            <button
              type="button"
              className={`${styles.saveButton} ${saved ? styles.saveButtonActive : ""}`}
              aria-pressed={saved}
              aria-label={saved ? `Quitar ${family.title} de guardados` : `Guardar ${family.title}`}
              onClick={() => setSaved((value) => !value)}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className={styles.trustRow}>
            {SUPPORT_ITEMS.slice(0, 3).map(({ icon: ItemIcon, title, text }) => (
              <div key={title}>
                <ItemIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span><strong>{title}</strong><small>{text}</small></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.tabSection}>
        <div className={styles.tabs} role="tablist" aria-label="Información del producto">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? styles.tabActive : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanels}>
          <div className={styles.tabContent} role="tabpanel">
            {activeTab === "detalles" && (
              <>
                <p>{family.description}</p>
                <ul className={styles.panelList}>
                  {family.items.map((item) => (
                    <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </>
            )}

            {activeTab === "especificaciones" && (
              <dl className={styles.specList}>
                {family.specs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === "aplicaciones" && (
              <>
                <p>Estas líneas se instalan normalmente en:</p>
                <ul className={styles.panelList}>
                  {family.applications.map((application) => (
                    <li key={application}><Check size={14} aria-hidden="true" />{application}</li>
                  ))}
                </ul>
              </>
            )}

            {activeTab === "soporte" && (
              <ul className={styles.supportList}>
                {SUPPORT_ITEMS.map(({ icon: ItemIcon, title, text }) => (
                  <li key={title}>
                    <ItemIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span><strong>{title}</strong><small>{text}</small></span>
                  </li>
                ))}
              </ul>
            )}

            <p className={styles.tabNote}>Las especificaciones son de referencia; confirmamos cada detalle en la cotización.</p>
          </div>

          <figure className={styles.tabMedia}>
            <Image
              src="/catalogo/infraestructura.jpg"
              alt="Equipos de telecomunicaciones instalados"
              fill
              sizes="(max-width: 900px) 92vw, 40vw"
              className={styles.galleryImage + " " + styles.fitCover}
            />
            <figcaption>Así se ve el equipo cuando ya está trabajando.</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.relatedSection}>
        <div className={styles.relatedHeading}>
          <div>
            <p className={styles.sectionEyebrow}><i /> También podrías necesitar</p>
            <h2>Otras líneas del catálogo</h2>
          </div>
          <Link className={styles.textLink} href="/catalogo">Ver todo el catálogo <ArrowRight size={15} /></Link>
        </div>

        <div className={styles.relatedGrid}>
          {related.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link className={styles.relatedCard} href={`/catalogo/${item.slug}`} key={item.id}>
                <div className={`${styles.relatedVisual} ${styles[item.visual]}`}>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 700px) 90vw, 30vw"
                      className={`${styles.galleryImage} ${item.visual === "photoVisual" ? styles.fitCover : styles.fitContain}`}
                    />
                  ) : (
                    <div className={styles.graphic} aria-hidden="true">
                      <div className={styles.graphicOrbit}><i /><i /><i /></div>
                      <ItemIcon size={40} strokeWidth={1.1} />
                    </div>
                  )}
                  <span className={styles.relatedIndex}>{item.index}</span>
                </div>
                <div className={styles.relatedCopy}>
                  <p>{item.category}</p>
                  <h3>{item.title}</h3>
                  <span>{item.summary}</span>
                  <em>Ver detalle <ArrowUpRight size={15} /></em>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <p className={styles.contactEyebrow}>¿Te falta una pieza o no sabes cuál elegir?</p>
          <h2>Hagamos que<br /><em>todo conecte.</em></h2>
          <p>Cuéntanos qué necesitas conectar y te respondemos con una recomendación concreta, sin compromiso.</p>
          <Link className={styles.contactAction} href="/#contacto">
            Escribir al equipo <ArrowUpRight size={17} />
          </Link>
        </div>
        <span className={styles.contactLocation}>San Pedro Sula · Honduras</span>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/" aria-label="Arconet, inicio">
          <Image src="/arconet.png" alt="Arconet" width={2172} height={362} />
        </Link>
        <p>Conectividad que acerca.</p>
        <Link className={styles.backToCatalog} href="/catalogo">
          <ArrowLeft size={14} /> Volver al catálogo
        </Link>
        <span className={styles.footerCopyright}>© 2026 Arconet, S.A. · Honduras</span>
      </footer>
    </main>
  );
}
