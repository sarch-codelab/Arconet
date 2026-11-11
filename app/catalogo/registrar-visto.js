"use client";
import { useEffect } from "react";
import { registrarVisto } from "./vistos-recientes";

export default function RegistrarVisto({ href }) {
  useEffect(() => { try { registrarVisto(window.localStorage, href); } catch { /* Almacenamiento no disponible. */ } }, [href]);
  return null;
}
