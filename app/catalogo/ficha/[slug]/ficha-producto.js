"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import { useCart } from "../../../cart-context";
import { desplazarFila } from "../../desplazar-fila";
import {
  CONFIANZA_FICHA,
  NOTA_PRECIOS,
  TABS_FICHA,
  formatearPrecio,
  rutaFicha,
} from "../../ficha-data";
import styles from "./ficha-producto.module.css";

const ICONOS_CONFIANZA = [Truck, ShieldCheck, Headphones];

// Pestaña que se ve en el primer HTML: la tabla de especificaciones es la
// parte más útil y llega renderizada desde el servidor, sin esperar hidratación.
const PESTANA_INICIAL = "especificaciones";

export default function FichaProducto({ producto, ficha, relacionados }) {
  const [imagenActiva, setImagenActiva] = useState(0);
  const [presentacion, setPresentacion] = useState(ficha.presentaciones[0].id);
  const [cantidad, setCantidad] = useState(1);
  const [pestana, setPestana] = useState(PESTANA_INICIAL);
  const relacionadosRef = useRef(null);
  const { addItem, open: abrirCarrito, count } = useCart();

  const presentacionActual = ficha.presentaciones.find((item) => item.id === presentacion)
    || ficha.presentaciones[0];
  const imagenActual = ficha.galeria[Math.min(imagenActiva, ficha.galeria.length - 1)];

  const agregarAlCarrito = () => {
    // El carrito global es de COTIZACIÓN: guarda una línea local con el nombre
    // y la presentación elegida. No crea productos en la BD ni llama a /api.
    addItem({
      slug: `catalogo-${producto.id}`,
      href: rutaFicha(producto.id),
      title: producto.name,
      category: producto.line,
      image: producto.image,
      presentation: presentacionActual.label,
    }, cantidad);
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.brand} aria-label="Arconet, ir al inicio">
            <Image
              src="/arconet.png"
              alt="Arconet"
              width={150}
              height={25}
              sizes="150px"
              fetchPriority="low"
              className={styles.brandImg}
            />
          </Link>
          <nav className={styles.nav} aria-label="Navegación de la ficha">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/tienda">Tienda</Link>
            <Link href="/contacto">Contacto</Link>
          </nav>
          <button
            type="button"
            className={styles.cartButton}
            onClick={abrirCarrito}
            aria-label={`Abrir carrito de cotización, ${count} ${count === 1 ? "unidad" : "unidades"}`}
          >
            <ShoppingCart size={16} aria-hidden="true" />
            <span>Carrito</span>
            {count > 0 && <i aria-hidden="true">{count > 99 ? "99+" : count}</i>}
          </button>
        </div>
      </header>

      <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link href="/">Inicio</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/catalogo">Catálogo</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/catalogo#destacados">Productos destacados</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{producto.name}</span>
        </nav>

        <section className={styles.producto} aria-label={`Ficha de ${producto.name}`}>
          {/* Galería: la foto principal y tres recortes de la MISMA imagen. */}
          <div className={styles.mediaColumn}>
            <div className={styles.media}>
              <Image
                src={imagenActual}
                alt={`${producto.name} — vista ${imagenActiva + 1} de ${ficha.galeria.length}`}
                fill
                sizes="(max-width: 900px) 92vw, 46vw"
                loading="eager"
                className={styles.mediaImg}
              />
              {producto.offer && <span className={styles.mediaFlag}>Oferta</span>}
            </div>
            <div className={styles.gallery} role="group" aria-label="Vistas del equipo">
              {ficha.galeria.map((imagen, indice) => (
                <button
                  key={imagen}
                  type="button"
                  className={`${styles.galleryThumb} ${indice === imagenActiva ? styles.galleryThumbActive : ""}`}
                  onClick={() => setImagenActiva(indice)}
                  aria-pressed={indice === imagenActiva}
                  aria-label={`Ver vista ${indice + 1} de ${ficha.galeria.length}`}
                >
                  <Image
                    src={imagen}
                    alt=""
                    fill
                    sizes="96px"
                    loading="lazy"
                    className={styles.galleryImg}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.info}>
            <p className={styles.eyebrow}>{producto.line}</p>
            <h1>{producto.name}</h1>

            {/* Adaptación de las estrellas de la referencia: una línea
                recomendada por instaladores, sin inventar reseñas ni conteos. */}
            <div className={styles.recomendado}>
              <span className={styles.stars} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" />)}
              </span>
              <span>Línea recomendada por instaladores</span>
            </div>

            <p className={styles.descripcion}>{ficha.descripcion}</p>

            <div className={styles.precioFila}>
              <strong>{formatearPrecio(ficha.precio)}</strong>
              {ficha.precioAnterior && <del>{formatearPrecio(ficha.precioAnterior)}</del>}
              <span className={styles.precioEtiqueta}>{ficha.etiqueta}</span>
            </div>
            <p className={styles.precioNota}>{NOTA_PRECIOS}</p>

            <div className={styles.campo}>
              <span className={styles.campoLabel}>
                Presentación: <strong>{presentacionActual.label}</strong>
              </span>
              <div className={styles.swatches} role="group" aria-label="Presentación del equipo">
                {ficha.presentaciones.map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    className={`${styles.swatch} ${opcion.id === presentacion ? styles.swatchActive : ""}`}
                    onClick={() => setPresentacion(opcion.id)}
                    aria-pressed={opcion.id === presentacion}
                    aria-label={opcion.label}
                    title={`${opcion.label} — ${opcion.nota}`}
                  >
                    <i style={{ background: opcion.tint }} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <span className={styles.campoNota}>{presentacionActual.nota}</span>
            </div>

            <div className={styles.compraFila}>
              <div className={styles.qty} role="group" aria-label="Cantidad">
                <button
                  type="button"
                  onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
                  disabled={cantidad <= 1}
                  aria-label="Quitar una unidad"
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <span aria-live="polite" aria-label={`Cantidad: ${cantidad}`}>{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((valor) => Math.min(99, valor + 1))}
                  disabled={cantidad >= 99}
                  aria-label="Agregar una unidad"
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>
              <span className={styles.disponibilidad}>
                <Check size={14} aria-hidden="true" /> Disponibilidad a confirmar
              </span>
            </div>

            <div className={styles.botones}>
              <Link className={styles.comprar} href="/contacto">
                Comprar ahora <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <button type="button" className={styles.agregar} onClick={agregarAlCarrito}>
                <ShoppingCart size={16} aria-hidden="true" /> Agregar al carrito
              </button>
            </div>
            <p className={styles.ayudaCompra}>
              Al comprar ahora te contactamos para confirmar existencias, presentación y precio final.
            </p>

            <ul className={styles.confianza}>
              {CONFIANZA_FICHA.map((item, indice) => {
                const Icono = ICONOS_CONFIANZA[indice];
                return (
                  <li key={item.titulo}>
                    <span className={styles.confianzaIcono}><Icono size={16} aria-hidden="true" /></span>
                    <span>
                      <strong>{item.titulo}</strong>
                      <small>{item.texto}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Pestañas con la tabla de especificaciones, como la referencia. */}
        <section className={styles.detalles} aria-label="Información del producto">
          <div className={styles.tabs} role="tablist" aria-label="Información del producto">
            {TABS_FICHA.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={pestana === tab.id}
                className={pestana === tab.id ? styles.tabActive : ""}
                onClick={() => setPestana(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {pestana === "especificaciones" && (
            <div
              role="tabpanel"
              id="panel-especificaciones"
              aria-labelledby="tab-especificaciones"
              className={styles.panel}
            >
              <div className={styles.tablaScroll}>
                <table className={styles.tabla}>
                  <caption className={styles.srOnly}>Especificaciones de referencia de {producto.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Especificación</th>
                      <th scope="col">Detalle</th>
                      <th scope="col">Más información</th>
                      <th scope="col">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.especificaciones.map((fila) => (
                      <tr key={fila.nombre}>
                        <th scope="row">{fila.nombre}</th>
                        <td>{fila.detalle}</td>
                        <td>{fila.extra}</td>
                        <td>{fila.observacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pestana === "descripcion" && (
            <div
              role="tabpanel"
              id="panel-descripcion"
              aria-labelledby="tab-descripcion"
              className={`${styles.panel} ${styles.panelTexto}`}
            >
              <h2>Sobre este equipo</h2>
              <p>{ficha.descripcion}</p>
              <ul className={styles.destacados}>
                {ficha.destacados.map((texto) => (
                  <li key={texto}><Check size={16} aria-hidden="true" /> {texto}</li>
                ))}
              </ul>
              <p className={styles.panelNota}>{NOTA_PRECIOS}</p>
            </div>
          )}

          {pestana === "envio" && (
            <div
              role="tabpanel"
              id="panel-envio"
              aria-labelledby="tab-envio"
              className={`${styles.panel} ${styles.panelTexto}`}
            >
              <h2>Envío, garantía y soporte</h2>
              <p>Enviamos a San Pedro Sula y al resto de Honduras. El plazo y el costo se confirman según la presentación elegida y la dirección de entrega.</p>
              <p>Todos los equipos se entregan con garantía y respaldo local. Nuestro equipo técnico te acompaña en la puesta en marcha y resuelve dudas de instalación.</p>
              <p>Antes de facturar recibes una cotización por escrito con el precio final, la disponibilidad real y las condiciones de la garantía.</p>
              <Link className={styles.panelCta} href="/contacto">Pedir asesoría técnica <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          )}
        </section>

        {/* Relacionados: 3 fichas reales de la misma vitrina, con sus flechas. */}
        <section className={styles.relacionados} aria-label="Productos relacionados">
          <div className={styles.relacionadosHead}>
            <div>
              <span className={styles.eyebrow}>Sigue explorando</span>
              <h2>También te puede servir</h2>
            </div>
            <div className={styles.flechas}>
              <button type="button" aria-label="Relacionados anteriores" onClick={() => desplazarFila(relacionadosRef, -1)}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Relacionados siguientes" onClick={() => desplazarFila(relacionadosRef, 1)}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={styles.relacionadosFila} ref={relacionadosRef}>
            {relacionados.map((item) => (
              <Link key={item.id} href={rutaFicha(item.id)} className={styles.relCard}>
                <div className={styles.relMedia}>
                  <Image src={item.image} alt="" fill sizes="(max-width: 620px) 72vw, 300px" loading="lazy" draggable={false} className={styles.relImg} />
                  <span className={styles.relBadge}>Nuevo</span>
                </div>
                <div className={styles.relBody}>
                  <span className={styles.relLine}>{item.line}</span>
                  <strong>{item.name}</strong>
                  <span className={styles.relPrecio}>
                    {formatearPrecio(item.precio)}
                    {item.precioAnterior && <del>{formatearPrecio(item.precioAnterior)}</del>}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cierre sin elemento de pie propio: el componente compartido sigue
            siendo el único y /catalogo no se añade al menú global. */}
        <div className={styles.cierre}>
          <div>
            <strong>¿Necesitas ayuda para tu instalación?</strong>
            <span>Nuestro equipo te ayuda a elegir la configuración correcta.</span>
          </div>
          <div className={styles.cierreAcciones}>
            <Link href="/contacto" className={styles.cierreCta}>Hablar con un asesor</Link>
            <Link href="/catalogo" className={styles.volver}><ArrowLeft size={15} aria-hidden="true" /> Volver al catálogo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
