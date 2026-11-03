"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Globe2, Handshake, ShieldCheck, Truck } from "lucide-react";
import styles from "./home-marcas.module.css";

// Fabricantes que Arconet distribuye. Los logos viven en /public/marcas y
// están recortados a su contenido; los que no tienen archivo muestran su
// nombre con el mismo peso visual, sin inventar un logotipo.
const MARCAS = [
  { nombre: "FiberHome", logo: "/marcas/fiberhome.png", rubro: "Equipos ópticos y FTTH" },
  { nombre: "Sumitomo", logo: "/marcas/sumitomo.png", rubro: "Fusión y medición" },
  { nombre: "Lindsay", logo: "/marcas/lindsay.png", rubro: "Redes HFC y CATV" },
  { nombre: "Joinwit", logo: "/marcas/joinwit.png", rubro: "Instrumentos ópticos" },
  { nombre: "PBI", logo: "", rubro: "Cabecera y CATV" },
  { nombre: "Belden", logo: "", rubro: "Cableado y coaxial" },
];

const RESPALDOS = [
  { icon: ShieldCheck, titulo: "Garantía del fabricante", texto: "Cada equipo con su respaldo real, no con una promesa de mostrador." },
  { icon: BadgeCheck, titulo: "Producto original", texto: "Importación directa: sin réplicas ni intermediarios de más." },
  { icon: Handshake, titulo: "Asesoría técnica", texto: "Te decimos qué sirve para tu red antes de que compres." },
  { icon: Truck, titulo: "Entrega coordinada", texto: "Despacho a cualquier departamento de Honduras." },
];

const CIFRAS = [
  { valor: "18", label: "Departamentos" },
  { valor: "6", label: "Fabricantes" },
  { valor: "100%", label: "Producto original" },
];

function Logotipo({ marca }) {
  if (marca.logo) {
    return (
      <Image
        src={marca.logo}
        alt={`Logotipo de ${marca.nombre}`}
        width={240}
        height={80}
        unoptimized
        className={styles.logo}
      />
    );
  }
  // Sin archivo: el nombre con la misma altura visual que un logotipo.
  return <span className={styles.logoTexto}>{marca.nombre}</span>;
}

export default function HomeMarcas() {
  return (
    <section id="marcas" className={styles.section}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowMark} aria-hidden="true" /> Cobertura nacional
        </p>
        <h2 data-split>
          Tecnología respaldada
          <br />
          <em>por fabricantes.</em>
        </h2>
        <p className={styles.lead}>
          No armamos un catálogo con lo que aparezca. Trabajamos con fabricantes que responden
          por su equipo, y lo llevamos a cada departamento de Honduras.
        </p>
      </div>

      <ul className={styles.grid} aria-label="Fabricantes que distribuimos">
        {MARCAS.map((marca) => (
          <li key={marca.nombre} className={styles.card} data-reveal data-card-reveal>
            <div className={styles.logoCaja}>
              <Logotipo marca={marca} />
            </div>
            <p className={styles.rubro}>{marca.rubro}</p>
          </li>
        ))}
      </ul>

      <div className={styles.cifras}>
        {CIFRAS.map((cifra) => (
          <div key={cifra.label} className={styles.cifra}>
            <strong>{cifra.valor}</strong>
            <span>{cifra.label}</span>
          </div>
        ))}
      </div>

      <ul className={styles.respaldos}>
        {RESPALDOS.map(({ icon: Icon, titulo, texto }) => (
          <li key={titulo} data-reveal data-card-reveal>
            <span className={styles.respaldoIcono}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.acciones}>
        <Link className={styles.accionPrincipal} href="/tienda">
          Ver el catálogo
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <p className={styles.accionNota}>
          <Globe2 size={15} aria-hidden="true" />
          San Pedro Sula y Tegucigalpa · envíos a todo el país
        </p>
      </div>
    </section>
  );
}
