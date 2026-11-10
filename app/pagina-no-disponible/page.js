import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Wrench } from "lucide-react";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import styles from "./page.module.css";

export const metadata = { title: "Página temporalmente no disponible", robots: { index: false, follow: false } };

export default async function PaginaNoDisponible({ searchParams }) {
  const params = await searchParams;
  const page = PUBLIC_PAGES.find(({ id }) => id === params?.pagina);
  return (
    <main className={styles.page}>
      <Link href="/" aria-label="Arconet, ir al inicio" className={styles.logo}>
        <Image src="/arconet.png" alt="Arconet" width={1200} height={200} sizes="150px" fetchPriority="low" />
      </Link>
      <section className={styles.content}>
        <div className={styles.icon}><Wrench size={27} aria-hidden="true" /></div>
        <p className={styles.eyebrow}>Estamos trabajando para ti</p>
        <h1>{page ? `${page.name} no está disponible por ahora` : "Esta página no está disponible por ahora"}</h1>
        <p>Estamos realizando ajustes. Vuelve a intentarlo más tarde.</p>
        <Link href="/" className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Volver al inicio</Link>
      </section>
    </main>
  );
}
