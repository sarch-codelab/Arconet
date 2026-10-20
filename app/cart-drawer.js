"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { buildCartMessage, useCart } from "./cart-context";
import { sileo } from "./toaster";
import styles from "./cart.module.css";

const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP || "").replace(/\D/g, "");
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
const SUBJECT = "Solicitud de cotización — Arconet";

export default function CartDrawer() {
  const { items, count, isOpen, close, setQuantity, removeItem, clear } = useCart();
  const [copied, setCopied] = useState(false);

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
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : null;
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(message)}`;

  const copyOrder = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const area = document.createElement("textarea");
        area.value = message;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
    } catch {
      /* portapapeles no disponible */
    }
    setCopied(true);
    sileo.success({ title: "Pedido copiado al portapapeles." });
  };

  return (
    <div
      className={isOpen ? `${styles.layer} ${styles.layerOpen}` : styles.layer}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
    >
      <button type="button" className={styles.backdrop} aria-label="Cerrar cotización" onClick={close} />

      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="Carrito de cotización">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={styles.panelIcon}>
              <ShoppingCart size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Tu cotización</strong>
              <span>
                {count > 0 ? `${count} ${count === 1 ? "unidad" : "unidades"}` : "Sin productos aún"}
              </span>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={close} aria-label="Cerrar cotización">
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
              Suma líneas del catálogo y armamos tu pedido o cotización en un solo lugar.
            </p>
            <Link className={styles.emptyButton} href="/catalogo#catalogo-items" onClick={close}>
              Explorar catálogo <ArrowUpRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.key} className={styles.item}>
                  <span className={styles.thumb}>
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="76px" className={styles.thumbImage} />
                    ) : (
                      <span className={styles.thumbFallback} aria-hidden="true">
                        <ShoppingCart size={18} />
                      </span>
                    )}
                  </span>

                  <div className={styles.itemBody}>
                    <div className={styles.itemHead}>
                      <Link className={styles.itemTitle} href={`/catalogo/${item.slug}`} onClick={close}>
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
                  className={`${styles.action} ${whatsappHref ? "" : styles.actionPrimary}`}
                  href={mailHref}
                >
                  <Mail size={16} aria-hidden="true" /> Enviar por correo
                </a>
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
