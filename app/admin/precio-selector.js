"use client";
import { PRICE_LEVELS, priceAt } from "@/lib/precios";
import { formatPrice } from "./products-store";
export default function PrecioSelector({
  product,
  value = "normal",
  onChange,
  label = "Tarifa",
  snapshot,
  className,
}) {
  return (
    <select
      className={className}
      value={value || "normal"}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    >
      {PRICE_LEVELS.map((level) => {
        const saved = snapshot != null && (value || "normal") === level.id;
        const price = saved ? snapshot : priceAt(product, level.id);
        return (
          <option key={level.id} value={level.id} disabled={price == null}>
            {level.label} ·{" "}
            {price == null ? "Sin configurar" : formatPrice(price)}
            {saved ? " · guardado" : ""}
          </option>
        );
      })}
    </select>
  );
}
