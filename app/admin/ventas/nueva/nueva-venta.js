"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import FacturacionPanel from "../../facturacion-panel";
import { fetchProducts } from "../../products-store";
import { fetchClientes } from "../../clientes-store";
import { allowedSalesCreationModes } from "@/lib/admin-navigation";
import adminStyles from "../../admin-experience.module.css";
import styles from "../../ventas-section.module.css";
import pageStyles from "./nueva-venta.module.css";

/**
 * Página completa «Nueva venta»: el editor fiscal ocupa toda la página
 * (no es una pantalla emergente) y a la derecha se actualiza en vivo el
 * carrito del cliente mientras agregas o editas productos y servicios.
 */
export default function NuevaVenta({ session }) {
  const router = useRouter();
  const permisos = useMemo(() => session?.permisos || [], [session?.permisos]);
  const canCreateSale = allowedSalesCreationModes(permisos).includes("fiscal");
  const fiscalEditor = useRef(null);
  const [products, setProducts] = useState([]);
  const [clientes, setClientes] = useState([]);

  const refreshInventory = useCallback(async () => {
    if (!permisos.includes("productos:read")) return;
    try {
      setProducts(await fetchProducts());
    } catch {
      // El borrador ya se guardó: un fallo de refresco no invalida la venta.
    }
  }, [permisos]);

  useEffect(() => {
    if (permisos.includes("productos:read")) {
      fetchProducts().then(setProducts).catch(() => {});
    }
    if (permisos.includes("clientes:read")) {
      fetchClientes().then(setClientes).catch(() => {});
    }
  }, [permisos]);

  if (!canCreateSale) {
    return (
      <main className={adminStyles.adminPage}>
        <div className={adminStyles.shell}>
          <div className={adminStyles.body}>
            <p className={styles.loadError} role="alert">
              No tienes permisos para crear una venta fiscal.
            </p>
            <Link href="/panel-administrativo?section=ventas" className={adminStyles.ghostBtn}>
              <ArrowLeft size={15} /> Volver a Ventas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={adminStyles.adminPage}>
      <div className={adminStyles.shell}>
        <div className={adminStyles.content}>
          <header className={`${adminStyles.sectionSubBar} ${pageStyles.pageHeader}`}>
            <div className={adminStyles.topbarTitle}>
              <Link href="/panel-administrativo?section=ventas" className={`${adminStyles.ghostBtn} ${pageStyles.backLink}`}>
                <ArrowLeft size={15} /> Volver a Ventas
              </Link>
              <h1>Nueva venta · Factura fiscal</h1>
              <p>
                Registra esta venta una sola vez con su comprobante fiscal. El
                carrito del cliente se actualiza en vivo a la derecha mientras
                agregas productos, servicios o cambias sus datos.
              </p>
            </div>
            <div className={`${adminStyles.topbarActions} ${pageStyles.account}`}>
              <span className={`${adminStyles.ghostBtn} ${pageStyles.accountName}`}>{session?.nombre}</span>
            </div>
          </header>

          <FacturacionPanel
            embedded
            livePreview
            editorRef={fiscalEditor}
            hideTopbar
            session={session}
            clientes={clientes}
            productos={products}
            saleEditorOpen
            detailOnly={false}
            onSaleEditorClose={() => {
              router.push("/panel-administrativo?section=ventas");
            }}
            onInventoryChanged={refreshInventory}
            onClientCreated={client => setClientes(current => [client, ...current.filter(item => item.id !== client.id)])}
          />
        </div>
      </div>
    </main>
  );
}
