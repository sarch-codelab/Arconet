"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultDockMenu, visibleDockMenu } from "@/lib/dock-menu";

export default function useDockMenu(forStore = false) {
  const [menu, setMenu] = useState(() => visibleDockMenu(defaultDockMenu()));
  useEffect(() => {
    let active = true;
    fetch("/api/menu-navegacion", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.menu && Array.isArray(data.menu.items)) setMenu(data.menu); })
      .catch(() => { /* El menú original sigue disponible sin conexión. */ });
    return () => { active = false; };
  }, []);
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
