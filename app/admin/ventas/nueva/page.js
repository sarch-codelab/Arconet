"use client";

import { useEffect, useRef } from "react";
import { Receipt } from "lucide-react";
import adminStyles from "../admin-experience.module.css";
import styles from "../ventas-section.module.css";
import FacturacionPanel from "../facturacion-panel";
import { useSession } from "@/lib/session"; // or whatever session hook
import { allowedSalesCreationModes } from "@/lib/admin-navigation";

// Esta página se renderiza en el lado cliente (Next.js App Router)
// para que el estado del formulario y la previsualización en vivo funcionen.
export default function NuevaVentaPage() {
  // Simulación de sesión (en producción se obtiene del contexto o hook)
  // El código real debe usar el contexto de sesión del panel.
  // Aquí asumimos que el componente padre o un hook provee la sesión.
  // Para simplificar, importamos el contexto del panel si es posible.
  const session = undefined; // TODO: obtener sesión real
  const permisos = session?.permisos || [];
  const canCreateSale = allowedSalesCreationModes(permisos).includes("fiscal");

  const fiscalEditor = useRef(null);

  // Si no tiene permisos, redirigir (en producción usar next/navigation redirect)
  // useEffect(() => {
  //   if (!canCreateSale) window.location.href = "/panel-administrativo/ventas";
  // }, [canCreateSale]);

  // Si no hay permisos, mostramos un aviso (en lugar de redirigir en cliente)
  if (!canCreateSale) {
    return (
      <div className={adminStyles.body}>
        <p className={styles.loadError} role="alert">
          No tienes permisos para crear una venta fiscal.
        </p>
      </div>
    );
  }

  return (
    <div className={adminStyles.body}>
      <header className={adminStyles.modalHead} style={{ marginBottom: "24px" }}>
        <div>
          <p className={adminStyles.eyebrow}>Factura fiscal · ISV e inventario</p>
          <h2>Nueva venta</h2>
        </div>
      </header>

      <FacturacionPanel
        embedded
        editorRef={fiscalEditor}
        hideTopbar
        session={session}
        saleEditorOpen={true}
        detailOnly={false}
        onSaleEditorClose={() => window.location.href = "/panel-administrativo/ventas"}
      />
    </div>
  );
}
