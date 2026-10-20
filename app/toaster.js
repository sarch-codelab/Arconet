"use client";

import { useEffect, useState } from "react";
import { Toaster, sileo } from "sileo";

export { sileo };

const DEFAULT_OPTIONS = {
  roundness: 14,
};

function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export default function AppToaster() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(readTheme());

    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      position="top-right"
      theme={theme}
      offset={{ top: 18, right: 18, bottom: 18, left: 18 }}
      options={DEFAULT_OPTIONS}
    />
  );
}
