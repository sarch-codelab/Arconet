"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProductoEditor from "../../producto-editor";
import { fetchProducts } from "../../products-store";
import { fetchCategorias } from "../../categories-store";
import adminStyles from "../../admin-experience.module.css";
import pageStyles from "./nuevo-producto.module.css";

// Ruta canónica del panel: Inventario → vista Productos.
const INVENTORY_URL = "/panel-administrativo?section=inventario&view=productos";

/**
 * Página completa «Nuevo producto»: ocupa toda la página (no es una pantalla
 * emergente) y muestra la misma forma completa del diálogo de edición:
 * foto, galería, código de barras, precios, stock, ubicación y más.
 */
export default function NuevaProducto({ session }) {
  const router = useRouter();
  const permisos = useMemo(() => session?.permisos || [], [session?.permisos]);
  // Sin precios:write el producto se guarda sin precio y queda pendiente de
  // revisión: el acceso a la página solo exige productos:write.
  const canCreate = permisos.includes("productos:write");
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const refreshCatalog = useCallback(async () => {
    if (!permisos.includes("productos:read")) return;
    try {
      setProducts(await fetchProducts());
    } catch {
      // El producto ya se guardó: un fallo de refresco no invalida el alta.
    }
  }, [permisos]);

  useEffect(() => {
    if (permisos.includes("productos:read")) {
      fetchProducts().then(setProducts).catch(() => {});
    }
    if (permisos.includes("categorias:read")) {
      fetchCategorias().then(setCategorias).catch(() => {});
    }
  }, [permisos]);

  if (!canCreate) {
    return (
      <main className={adminStyles.adminPage}>
        <div className={adminStyles.shell}>
          <div className={adminStyles.body}>
            <p className={adminStyles.alertItem} role="alert">
              No tienes permisos para crear productos.
            </p>
            <Link href={INVENTORY_URL} className={adminStyles.ghostBtn}>
              <ArrowLeft size={15} /> Volver a Inventario
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={adminStyles.adminPage} aria-label="Nuevo producto · Catálogo">
      <div className={adminStyles.shell}>
        <div className={adminStyles.content}>
          <header className={`${adminStyles.sectionSubBar} ${pageStyles.pageHeader}`}>
            <div className={adminStyles.topbarTitle}>
              <Link href={INVENTORY_URL} className={`${adminStyles.ghostBtn} ${pageStyles.backLink}`}>
                <ArrowLeft size={15} /> Volver a Inventario
              </Link>
              <h1>Nuevo producto · Catálogo</h1>
              <p>
                Registra el producto con su foto, precios, stock y detalles. La
                forma es la misma que la pantalla de edición del catálogo.
              </p>
            </div>
            <div className={adminStyles.topbarActions}>
              <span className={`${adminStyles.ghostBtn} ${pageStyles.account}`}>{session?.nombre}</span>
            </div>
          </header>

          <div className={pageStyles.pageBody}>
            <section className={`${adminStyles.card} ${pageStyles.productCard}`}>
              <header className={adminStyles.cardHeader}>
                <div>
                  <p className={adminStyles.eyebrow}>Nuevo</p>
                  <h3>Agregar producto</h3>
                </div>
              </header>
              <div className={`${adminStyles.cardBody} ${pageStyles.cardBody}`}>
                <ProductoEditor
                  session={session}
                  products={products}
                  categorias={categorias}
                  formClassName=""
                  onSaved={() => {
                    // Tras el alta, volver a la lista de productos del
                    // inventario: el producto queda visible junto a los demás.
                    refreshCatalog();
                    router.push(INVENTORY_URL);
                  }}
                  onCancel={() => router.push(INVENTORY_URL)}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
