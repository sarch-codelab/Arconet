"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./page-transition.module.css";

const COVER_MS = 520;
const REVEAL_MS = 620;
const SAFETY_MS = 1400;
const SETTLE_MS = 90;
const CELL_SIZE = 52;

function resolveInternalHref(anchor) {
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.dataset.noTransition === "true") return null;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return null;

  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return url.pathname + url.search + url.hash;
}

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState("idle");
  const [grid, setGrid] = useState({ cols: 16, rows: 10 });
  const [message, setMessage] = useState("");

  const phaseRef = useRef("idle");
  const routerRef = useRef(router);
  const timers = useRef({});
  const navigateRef = useRef(null);
  const playRef = useRef(null);
  const lastPathRef = useRef(pathname);

  routerRef.current = router;

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const startReveal = () => {
    if (phaseRef.current !== "covered") return;
    window.clearTimeout(timers.current.safety);
    window.clearTimeout(timers.current.reveal);
    timers.current.reveal = window.setTimeout(() => {
      if (phaseRef.current !== "covered") return;
      setPhaseSafe("reveal");
      timers.current.done = window.setTimeout(() => {
        if (phaseRef.current !== "reveal") return;
        setPhaseSafe("idle");
        setMessage("");
      }, REVEAL_MS);
    }, SETTLE_MS);
  };

  const navigate = (href) => {
    if (phaseRef.current !== "idle") return;
    setMessage("");
    setPhaseSafe("cover");
    timers.current.cover = window.setTimeout(() => {
      routerRef.current.push(href);
      setPhaseSafe("covered");
      timers.current.safety = window.setTimeout(startReveal, SAFETY_MS);
    }, COVER_MS);
  };

  const playTransition = (label, onCovered, hold) => {
    if (phaseRef.current !== "idle") return;
    setMessage(label || "");
    setPhaseSafe("cover");
    timers.current.cover = window.setTimeout(() => {
      if (phaseRef.current !== "cover") return;
      if (typeof onCovered === "function") onCovered();
      setPhaseSafe("covered");
      const dwell = typeof hold === "number" && hold > 0 ? hold : SETTLE_MS;
      timers.current.safety = window.setTimeout(startReveal, dwell);
    }, COVER_MS);
  };

  navigateRef.current = navigate;
  playRef.current = playTransition;

  useEffect(() => {
    const computeGrid = () => {
      const cols = Math.max(8, Math.ceil(window.innerWidth / CELL_SIZE));
      const rows = Math.max(6, Math.ceil(window.innerHeight / CELL_SIZE));
      setGrid((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }));
    };
    const root = document.documentElement;
    let wait = 0;
    if (root.hasAttribute("data-boot")) {
      wait = window.setInterval(() => {
        if (!root.hasAttribute("data-boot")) {
          window.clearInterval(wait);
          computeGrid();
        }
      }, 100);
    } else {
      computeGrid();
    }
    window.addEventListener("resize", computeGrid);
    return () => {
      window.clearInterval(wait);
      window.removeEventListener("resize", computeGrid);
    };
  }, []);

  useEffect(() => {
    lastPathRef.current = pathname;
    if (phaseRef.current === "covered") startReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      if (phaseRef.current !== "idle") return;
      if (window.location.pathname === lastPathRef.current) return;
      setMessage("");
      setPhaseSafe("cover");
      timers.current.popCover = window.setTimeout(() => {
        if (phaseRef.current !== "cover") return;
        window.clearTimeout(timers.current.safety);
        setPhaseSafe("covered");
        timers.current.safety = window.setTimeout(startReveal, SAFETY_MS);
        startReveal();
      }, COVER_MS);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleTransition = (event) => {
      const detail = (event && event.detail) || {};
      playRef.current(detail.message || "", detail.onCovered, detail.hold);
    };
    window.addEventListener("arconet:transition", handleTransition);
    return () => window.removeEventListener("arconet:transition", handleTransition);
  }, []);

  useEffect(() => {
    const prefetched = new Set();

    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      const href = resolveInternalHref(anchor);
      if (!href) return;
      event.preventDefault();
      navigateRef.current(href);
    };

    const handlePrefetch = (event) => {
      const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      const href = resolveInternalHref(anchor);
      if (!href) return;
      const path = href.split("#")[0];
      if (prefetched.has(path)) return;
      prefetched.add(path);
      try {
        routerRef.current.prefetch(path);
      } catch {
        /* prefetch is best-effort */
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handlePrefetch, true);
    document.addEventListener("focusin", handlePrefetch, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handlePrefetch, true);
      document.removeEventListener("focusin", handlePrefetch, true);
    };
  }, []);

  useEffect(() => {
    const current = timers.current;
    return () => {
      Object.values(current).forEach(window.clearTimeout);
    };
  }, []);

  const cells = useMemo(() => {
    const { cols, rows } = grid;
    const total = cols * rows;
    const maxDiag = cols + rows - 2;
    return Array.from({ length: total }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const diag = row + col;
      return {
        id: index,
        inDelay: diag * 6,
        outDelay: (maxDiag - diag) * 6,
      };
    });
  }, [grid]);

  return (
    <div className={styles.overlay} data-phase={phase} aria-hidden="true">
      <div
        className={styles.grid}
        style={{ "--cols": grid.cols, "--rows": grid.rows }}
      >
        {cells.map((cell) => (
          <span
            key={cell.id}
            className={styles.cell}
            style={{ "--in": `${cell.inDelay}ms`, "--out": `${cell.outDelay}ms` }}
          />
        ))}
      </div>
      <span className={styles.logo}>
        <img
          src="/arconet.png"
          alt=""
          width="2172"
          height="362"
          decoding="async"
          draggable="false"
        />
      </span>
      {message ? <span className={styles.message}>{message}</span> : null}
    </div>
  );
}
