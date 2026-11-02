"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { buildCartMessage, useCart } from "./cart-context";
import { sileo } from "./toaster";
import styles from "./cart.module.css";
import { useContact } from "./contact-provider";
import { copyText } from "@/lib/clipboard";

const SUBJECT = "Solicitud de cotización — Arconet";

// Líneas reales del catálogo: mismas etiquetas que el menú de soluciones.
const SHORTCUTS = [
  { label: "Preconectorizado", href: "/tienda/categoria/soluciones-de-preconectorizado" },
  { label: "Herrajes", href: "/tienda/categoria/herrajes" },
  { label: "Gabinetes y racks", href: "/tienda/categoria/gabinetes-y-racks" },
  { label: "Equipos de medición", href: "/tienda/categoria/instrumentos-de-medicion-optica" },
];

export default function CartDrawer() {
  const { email: CONTACT_EMAIL } = useContact();
  // El carrito cuelga del layout raíz, así que está montado también en el panel
  // de administración. Ahí sus enlaces no llevan a ninguna parte: precargarlos
  // descargaba la tienda y sus categorías al abrir el panel. En el sitio
  // público la precarga sí es útil y se mantiene.
  const ruta = usePathname() || "";
  const precargar = !ruta.startsWith("/panel-administrativo");
  const { items, count, isOpen, close, setQuantity, removeItem, clear } = useCart();
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [generandoCotizacion, setGenerandoCotizacion] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/site-config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setWhatsappNumber(data?.whatsapp || ""); })
      .catch(() => { if (active) setWhatsappNumber(""); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const message = buildCartMessage(items);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null;
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(message)}`;

  const copyOrder = async () => {
    const success = await copyText(message);
    setCopied(success);
    if (success) {
      sileo.success({ title: "Pedido copiado al portapapeles." });
    } else {
      sileo.error({
        title: "No se pudo copiar el pedido.",
        description: "El navegador restringe el portapapeles. Abre la vista previa en una pestaña nueva o usa Enviar por correo.",
      });
    }
  };

  // Vista previa de la cotización: el mismo documento que genera el panel
  // administrativo, con los productos y precios de la base.
  const generarCotizacion = async () => {
    if (generandoCotizacion) return;
    setGenerandoCotizacion(true);
    try {
      const response = await fetch("/api/cotizaciones/previo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            slug: item.slug,
            titulo: item.title,
            cantidad: item.quantity,
            presentacion: item.presentation,
          })),
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "No se pudo generar la cotización.");
      }
      const html = await response.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      sileo.success({ title: "Vista previa de la cotización abierta." });
    } catch (err) {
      sileo.error({ title: err.message || "No se pudo generar la cotización." });
    } finally {
      setGenerandoCotizacion(false);
    }
  };

  return (
    <div
      className={isOpen ? `${styles.layer} ${styles.layerOpen}` : styles.layer}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
    >
      <button type="button" className={styles.backdrop} aria-label="Cerrar carrito" onClick={close} />

      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="Mi Carrito">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={styles.panelIcon}>
              <ShoppingCart size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Mi Carrito</strong>
              <span>
                {count > 0 ? `${count} ${count === 1 ? "unidad" : "unidades"}` : "Sin productos aún"}
              </span>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={close} aria-label="Cerrar carrito">
            <X size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <ShoppingCart size={26} aria-hidden="true" />
            </span>
            <p className={styles.emptyTitle}>Todavía no agregaste nada.</p>
            <p className={styles.emptyHint}>
              Agrega productos desde la tienda y prepáralos para pedir en un solo lugar.
            </p>
            <Link prefetch={precargar} className={styles.emptyButton} href="/tienda#catalogo-items" onClick={close}>
              Explorar catálogo <ArrowUpRight size={15} />
            </Link>

            {/* Atajos: el panel se quedaba con medio metro de vacío y para
                llegar a algo había que salir a la tienda y buscar. */}
            <nav className={styles.emptyShortcuts} aria-label="Líneas destacadas">
              <p className={styles.emptyShortcutsTitle}>Empieza por una línea</p>
              <div className={styles.emptyChips}>
                {SHORTCUTS.map((shortcut) => (
                  <Link
                    prefetch={precargar}
                    key={shortcut.href}
                    className={styles.emptyChip}
                    href={shortcut.href}
                    onClick={close}
                  >
                    {shortcut.label}
                  </Link>
                ))}
              </div>
            </nav>

            <p className={styles.emptyHelp}>
              ¿No sabes qué necesitas?{" "}
              <Link prefetch={precargar} href="/contacto" onClick={close}>Te asesoramos</Link>
            </p>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.key} className={styles.item}>
                  <span className={styles.thumb}>
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="76px" unoptimized={String(item.image).startsWith("data:")} className={styles.thumbImage} />
                    ) : (
                      <span className={styles.thumbFallback} aria-hidden="true">
                        <ShoppingCart size={18} />
                      </span>
                    )}
                  </span>

                  <div className={styles.itemBody}>
                    <div className={styles.itemHead}>
                      <Link prefetch={precargar} className={styles.itemTitle} href={item.href} onClick={close}>
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeItem(item.key)}
                        aria-label={`Quitar ${item.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p className={styles.itemMeta}>
                      {item.category ? `${item.category} · ` : ""}
                      {item.presentation}
                    </p>

                    <div className={styles.itemFooter}>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label="Restar una unidad"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Sumar una unidad"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className={styles.itemNote}>Cotización a la medida</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className={styles.panelFooter}>
              <p className={styles.footerNote}>
                Enviamos tu lista al equipo y confirmamos disponibilidad, precio y tiempos por escrito.
              </p>

              <div className={styles.actions}>
                {whatsappHref ? (
                  <a
                    className={`${styles.action} ${styles.actionPrimary}`}
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={16} aria-hidden="true" /> Enviar por WhatsApp
                  </a>
                ) : null}
                <a
                  className={styles.action}
                  href={mailHref}
                >
                  <Mail size={16} aria-hidden="true" /> Enviar por correo
                </a>
                <button
                  type="button"
                  className={`${styles.action} ${styles.actionPrimary}`}
                  onClick={generarCotizacion}
                  disabled={generandoCotizacion}
                >
                  {generandoCotizacion ? <RefreshCw size={16} className={styles.spin} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                  {generandoCotizacion ? "Generando…" : "Generar cotización"}
                </button>
                <button type="button" className={styles.action} onClick={copyOrder}>
                  {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copied ? "Copiado" : "Copiar pedido"}
                </button>
              </div>

              <button type="button" className={styles.clearButton} onClick={clear}>
                <Trash2 size={14} aria-hidden="true" /> Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
