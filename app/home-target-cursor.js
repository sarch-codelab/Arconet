"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const TargetCursor = dynamic(() => import("@/components/ui/target-cursor/target-cursor"), { ssr: false });
const query = "(hover: hover) and (pointer: fine)";
const subscribe = callback => {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export default function HomeTargetCursor({ container }) {
  const enabled = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!enabled) return null;
  return <TargetCursor container={container}
    targetSelector={'a[href], button:not(:disabled), [role="button"]:not([aria-disabled="true"])'}
    spinDuration={3} hoverDuration={0.24} size={30} cornerSize={9}
    thickness={2} dotSize={3} padding={5} hideDefaultCursor parallaxOn />;
}
