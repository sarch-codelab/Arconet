"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    // Theme initialization - runs once on client mount
    const k = "arconet-theme";
    const s = localStorage.getItem(k);
    const h = new Date().getHours();
    const t = (s === "light" || s === "dark") ? s : ((h >= 18 || h < 6) ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.colorScheme = t;

    // Boot animation
    const n = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (n && n.type === "prerender") return;
    const r = document.documentElement;
    r.setAttribute("data-boot", "cover");
    const t1 = setTimeout(() => r.setAttribute("data-boot", "reveal"), 700);
    const t2 = setTimeout(() => r.removeAttribute("data-boot"), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}