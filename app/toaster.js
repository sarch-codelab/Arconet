"use client";

import { useSyncExternalStore } from "react";
import { Toaster, sileo } from "sileo";

export { sileo };

const DEFAULT_OPTIONS = {
  roundness: 14,
  duration: 4600,
  autopilot: { expand: 2500, collapse: 4200 },
};

function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribeTheme(listener) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const readServerTheme = () => "light";

export default function AppToaster() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme);

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      offset={{
        top: "max(16px, env(safe-area-inset-top))",
        right: "max(16px, env(safe-area-inset-right))",
        bottom: "max(20px, env(safe-area-inset-bottom))",
        left: "max(16px, env(safe-area-inset-left))",
      }}
      options={DEFAULT_OPTIONS}
    />
  );
}
