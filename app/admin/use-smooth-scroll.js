"use client";

import { useCallback, useEffect, useRef } from "react";
import { observeNativeScroll } from "@/lib/native-scroll";
import { subscribeToOpenDialogs } from "./drag-scroll";

// Nombre conservado para los consumidores del panel. La rueda ya es nativa:
// los diálogos usan su propio overflow y useBodyScrollLock bloquea el fondo.
export function useAdminSmoothScroll() {
  const scrollRef = useRef(null);
  useEffect(() => {
    const scrollController = observeNativeScroll(({ progress }) => {
      document.documentElement.style.setProperty("--admin-scroll-progress", progress.toFixed(4));
    });
    scrollRef.current = scrollController;
    const detachDialogs = subscribeToOpenDialogs(count => {
      if (count === 0) scrollController.refresh();
    });
    return () => {
      detachDialogs();
      scrollController.destroy();
      scrollRef.current = null;
    };
  }, []);
  const scrollToTop = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return { scrollToTop };
}
