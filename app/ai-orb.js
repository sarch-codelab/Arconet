"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState } from "react";
import styles from "./ai-orb.module.css";

function Fallback() {
  return <span className={styles.fallback} data-orb-renderer="css" />;
}
const GradientOrb = dynamic(() => import("@/components/ui/gradient-orb"), { ssr: false, loading: Fallback });
class OrbBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Fallback /> : this.props.children; }
}

function OrbSurface() {
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => {
      const canvas = document.createElement("canvas");
      try {
        const gl = canvas.getContext("webgl2", { powerPreference: "low-power" });
        const supported = Boolean(gl);
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        if (active && supported) setReady(true);
      } catch { /* Sin WebGL: se conserva el orbe CSS. */ }
    };
    const idle = "requestIdleCallback" in window;
    const task = idle ? window.requestIdleCallback(load, { timeout: 2000 }) : window.setTimeout(load, 700);
    return () => { active = false; if (idle) window.cancelIdleCallback(task); else window.clearTimeout(task); };
  }, []);
  return ready && !lost ? <OrbBoundary><GradientOrb config={{ background: "transparent" }} onContextLost={() => setLost(true)} /></OrbBoundary> : <Fallback />;
}

// Decorativo: se reutiliza dentro de la píldora IA y su sección, nunca flotante.
export default function AiOrb({ size = 64 }) {
  return <span className={styles.widget} style={{ width: size, height: size }} aria-hidden="true">
    {size < 40 ? <Fallback /> : <OrbSurface />}
  </span>;
}
