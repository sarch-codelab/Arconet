"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import NavDock from "./nav-dock";
import { STORE_NAVIGATION } from "./navigation-data";
import { useCart } from "./cart-context";
import styles from "./public-site-navigation.module.css";

const standalone = ["/catalogo", "/contacto", "/ayuda", "/garantias", "/terminos", "/privacidad", "/cookies", "/aviso-legal"];
export function usesSharedPublicNavigation(pathname) {
  return standalone.some((path) => pathname === path || pathname.startsWith(`${path}/`)) || pathname.startsWith("/tienda/");
}

export default function PublicSiteNavigation() {
  const pathname = usePathname() || "/";
  const enabled = usesSharedPublicNavigation(pathname);
  const ownDock = pathname.startsWith("/tienda/");
  const [scrolled, setScrolled] = useState(false);
  const { count, open } = useCart();
  useEffect(() => {
    if (!enabled) return undefined;
    const update = () => setScrolled(window.scrollY > 100);
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [enabled, pathname]);
  if (!enabled) return null;
  const cart = <button type="button" className={styles.cart} onClick={open} aria-label={`Carrito, ${count} ${count === 1 ? "unidad" : "unidades"}`}><ShoppingCart size={17} aria-hidden="true" /><span>Carrito</span>{count > 0 && <b>{count > 99 ? "99+" : count}</b>}</button>;
  return <>
    <NavDock variant="inline" menuNumber={1} navigation={STORE_NAVIGATION} cartAction={pathname.startsWith("/tienda/") ? cart : null} />
    {!ownDock && <NavDock variant="scroll" visible={scrolled} navigation={STORE_NAVIGATION} />}
  </>;
}
