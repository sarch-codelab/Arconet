"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultDockMenu, visibleDockMenu } from "@/lib/dock-menu";

export const MENU_UPDATED_EVENT = "arconet:navigation-updated";
export const MENU_UPDATED_KEY = "arconet:navigation-updated";

export default function useDockMenu(forStore = false, menuNumber = 2) {
  const [menu, setMenu] = useState(() => visibleDockMenu(defaultDockMenu()));
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const refresh = () => {
      const request = ++sequence;
      fetch(menuNumber === 1 ? "/api/menu-navegacion-1" : "/api/menu-navegacion", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (active && request === sequence && data?.menu && Array.isArray(data.menu.items)) setMenu((previous) => JSON.stringify(previous) === JSON.stringify(data.menu) ? previous : data.menu); })
        .catch(() => { /* Conserva el último menú conocido ante un fallo temporal. */ });
    };
    const onFocus = () => refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const onStorage = (event) => { if (event.key === MENU_UPDATED_KEY) refresh(); };
    refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    window.addEventListener(MENU_UPDATED_EVENT, onFocus);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      window.removeEventListener(MENU_UPDATED_EVENT, onFocus);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [menuNumber]);
  return useMemo(() => {
    if (!forStore) return menu;
    const href = (value) => value.startsWith("#") ? `/${value}` : value;
    return {
      primary: { ...menu.primary, href: href(menu.primary.href) },
      legal: menu.legal.map((link) => ({ ...link, href: href(link.href) })),
      items: menu.items.map((item) => ({ ...item, href: href(item.href), megaGroups: item.megaGroups.map((group) => ({ ...group, links: group.links.map((link) => ({ ...link, href: href(link.href) })) })) })),
    };
  }, [menu, forStore]);
}
