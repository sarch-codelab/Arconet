"use client";

import { useEffect } from "react";
import { isGlowCard } from "@/lib/card-glow-targets";
import { decorateGlow, paintGlow } from "@/components/ui/border-glow/border-glow-utils";
import "@/components/ui/border-glow/border-glow.css";

export default function SiteBorderGlow() {
  useEffect(() => {
    const cards = new Map();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointerCard = null;
    let focusCard = null;
    let pending = null;
    let frame = 0;
    const attach = card => {
      if (cards.has(card) || !isGlowCard(card)) return;
      const existed = card.hasAttribute("data-border-glow");
      const value = card.getAttribute("data-border-glow");
      card.setAttribute("data-border-glow", "");
      const remove = decorateGlow(card, { fillOpacity: 0, glowRadius: 20, glowIntensity: 0.85 });
      cards.set(card, () => {
        remove();
        if (existed) card.setAttribute("data-border-glow", value); else card.removeAttribute("data-border-glow");
      });
    };
    const scan = node => {
      if (!(node instanceof Element)) return;
      attach(node);
      node.querySelectorAll('[class], [data-card-reveal], [data-border-glow]').forEach(attach);
    };
    const reset = card => {
      if (card && cards.has(card)) paintGlow(card, card === focusCard ? (reduced.matches ? 85 : 100) : 0, 180);
    };
    const closest = node => {
      for (let element = node instanceof Element ? node : null; element; element = element.parentElement) {
        if (cards.has(element)) return element;
      }
      return null;
    };
    const draw = () => {
      frame = 0;
      if (!pending || document.hidden) return;
      const { card, x, y } = pending;
      if (!cards.has(card) || !card.isConnected) return;
      const rect = card.getBoundingClientRect(); // Una sola lectura por cuadro.
      const cx = rect.width / 2, cy = rect.height / 2;
      if (!cx || !cy) return;
      const dx = x - rect.left - cx, dy = y - rect.top - cy;
      const edge = Math.min(1, Math.max(Math.abs(dx) / cx, Math.abs(dy) / cy)) * 100;
      paintGlow(card, Math.max(card === focusCard ? 85 : 0, edge * (reduced.matches ? 0.9 : 1)), (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360);
    };
    const move = event => {
      if (!fine.matches || event.pointerType === "touch") return;
      const next = closest(event.target);
      if (next !== pointerCard) { reset(pointerCard); pointerCard = next; }
      pending = next ? { card: next, x: event.clientX, y: event.clientY } : null;
      if (pending && !frame && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const leave = () => {
      reset(pointerCard); pointerCard = null; pending = null;
      cancelAnimationFrame(frame); frame = 0;
    };
    const focus = event => {
      const next = closest(event.target);
      const old = focusCard;
      focusCard = next;
      reset(old); reset(next);
    };
    const blur = event => {
      const old = focusCard;
      focusCard = closest(event.relatedTarget);
      reset(old); reset(focusCard);
    };
    const visibility = () => { if (document.hidden) leave(); };
    scan(document.body);
    const observer = new MutationObserver(records => {
      // Liberar también tarjetas retiradas por filtros, paginación o navegación SPA.
      if (records.some(record => record.removedNodes.length)) {
        cards.forEach((cleanup, card) => {
          if (!card.isConnected) {
            if (pointerCard === card) pointerCard = null;
            if (focusCard === card) focusCard = null;
            cleanup(); cards.delete(card);
          }
        });
      }
      for (const record of records) {
        if (record.type === "attributes") scan(record.target);
        else record.addedNodes.forEach(scan);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "data-card-reveal"] });
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", leave);
    window.addEventListener("resize", leave);
    window.addEventListener("scroll", leave, { passive: true, capture: true });
    fine.addEventListener("change", leave);
    reduced.addEventListener("change", leave);
    return () => {
      observer.disconnect(); leave();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", leave);
      window.removeEventListener("resize", leave);
      window.removeEventListener("scroll", leave, true);
      fine.removeEventListener("change", leave);
      reduced.removeEventListener("change", leave);
      cards.forEach(cleanup => cleanup()); cards.clear();
    };
  }, []);
  return null;
}
