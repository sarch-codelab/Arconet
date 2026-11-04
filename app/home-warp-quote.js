"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

export const HOME_QUOTE = "No vendemos solo equipo: ayudamos a que cada conexión funcione.";
const WarpText = dynamic(() => import("@/components/ui/warp-text/warp-text"), {
  ssr: false, loading: () => <span>{HOME_QUOTE}</span>,
});

export default function HomeWarpQuote() {
  const host = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "250px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <span ref={host} data-home-warp-quote="" style={{ display: "block" }}>
    {near ? <WarpText text={HOME_QUOTE} fontSize="inherit" fontWeight={400}
      fontFamily="inherit" letterSpacing={0} lineHeight={1.18} warpStrength={0.06}
      pointerStrength={0.24} chromatic={0.12} refraction={0.01} idleDrift={0.12}
      intro={false} /> : HOME_QUOTE}
  </span>;
}
